package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"

	"code.cloudfoundry.org/bytefmt"

	"golang.org/x/net/websocket"

	"net/url"

	sigar "github.com/cloudfoundry/gosigar"
	"github.com/hyperhq/runv/hypervisor/pod"
	"github.com/labstack/echo"
)

func CreateBox(c echo.Context) error {
	body, err := ioutil.ReadAll(c.Request().Body)
	if err != nil {
		return err
	}

	var req CreateBoxRequest
	err = json.Unmarshal(body, &req)
	if err != nil {
		return err
	}

	// validate captcha if secret is configured
	if os.Getenv("RECAPTCHA_SECRET") != "" {
		data := url.Values{}
		data.Set("secret", os.Getenv("RECAPTCHA_SECRET"))
		data.Set("response", req.Captcha)
		data.Set("remoteip", c.RealIP())

		res, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", data)
		if err != nil {
			return err
		}

		defer res.Body.Close()

		var verify CaptchaVerifyResponse
		err = json.NewDecoder(res.Body).Decode(&verify)
		if err != nil {
			return err
		}
		if !verify.Success {
			return errors.New("Captcha verification failed")
		}
	} else {
		Logger.Warn("Creating box without captcha verfication")
	}

	// verify image is whitelisted
	imageAllowed := false
	for _, image := range Images {
		if req.Image == image.Image {
			for _, version := range image.Versions {
				if req.Version == version {
					imageAllowed = true
				}
			}
		}
	}
	if !imageAllowed {
		return errors.New("Image not allowed")
	}

	// make sure we are not running out of memory
	mem := sigar.Mem{}
	mem.Get()
	if mem.ActualFree < bytefmt.GIGABYTE {
		return errors.New("Resource limit reached, try again later")
	}

	container := pod.UserContainer{
		Image: fmt.Sprintf("%s:%s", req.Image, req.Version),
	}

	pod := pod.UserPod{
		Name:       "termbox",
		Containers: []pod.UserContainer{container},
		Resource:   pod.UserResource{Vcpu: 1, Memory: 512},
	}

	podID, statusCode, err := Hyper.CreatePod(pod)
	if err != nil {
		if statusCode == http.StatusNotFound {
			err = HyperClient.PullImages(&pod)
			if err != nil {
				return err
			}
			podID, statusCode, err = Hyper.CreatePod(pod)
		}
		if err != nil {
			return err
		}
	}

	return c.JSON(http.StatusOK, CreateBoxResponse{PodID: podID})
}

type execMessage struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

func ExecBox(c echo.Context) error {

	websocket.Handler(func(ws *websocket.Conn) {
		defer ws.Close()

		podID := c.Param("id")
		podInfo, err := Hyper.GetPodInfo(podID)
		if err != nil {
			Logger.Debug(err)
			websocket.Message.Send(ws, "box does not exist, closing connection")
			return
		}
		if podInfo.Status.Phase != "Running" {
			_, err := Hyper.StartPod(podID, "", false, false, nil, nil, nil)
			if err != nil {
				Logger.Warn(err)
				return
			}
		}
		containerID, _ := Hyper.GetContainerByPod(podID)

		command, err := json.Marshal([]string{"bash"})
		if err != nil {
			Logger.Error(err)
			return
		}

		execID, err := Hyper.CreateExec(containerID, command, true)
		if err != nil {
			Logger.Warn(err)
			return
		}

		if err != nil {
			Logger.Warn(err)
			return
		}

		dec := json.NewDecoder(ws)

		r, w := io.Pipe()

		go func() {
			err = Hyper.StartExec(containerID, execID, true, r, ws, ws)
			if err != nil {
				Logger.Warn(err)
				return
			}
		}()

		for {
			var message ExecBoxMessage
			err := dec.Decode(&message)
			if err != nil {
				Logger.Warning(err)
				break
			}

			if message.Width != 0 && message.Height != 0 {
				err = Hyper.WinResize(containerID, execID, message.Height, message.Width)
				continue
			}
			if message.Data != "" {
				io.WriteString(w, message.Data)
				if err != nil {
					Logger.Warn(err)
					break
				}
			}
		}

	}).ServeHTTP(c.Response(), c.Request())
	return nil

}

type ExecReader struct {
	data      []byte
	readIndex int64
}
