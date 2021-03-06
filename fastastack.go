package main

import (
	"fmt"
	"os"
	"os/user"

	"gitlab.com/faststack/faststack/command"
	"gopkg.in/urfave/cli.v2"
	"gopkg.in/urfave/cli.v2/altsrc"
)

func main() {
	user, _ := user.Current()

	app := &cli.App{
		Name:    "faststack",
		Usage:   "On-demand Linux workspaces",
		Version: "1.0.0",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:  "config",
				Usage: "configuration path",
				Value: fmt.Sprintf("%s/%s", user.HomeDir, ".config/faststack/config.yml"), // TODO make cross platform
			},
			altsrc.NewStringFlag(&cli.StringFlag{
				Name:   "machinestack",
				Usage:  "Set the machinestack url",
				Value:  "http://localhost:9610",
				Hidden: true,
			}),
			altsrc.NewStringFlag(&cli.StringFlag{
				Name:   "billstack",
				Usage:  "Set the billstack url",
				Value:  "http://localhost:9620",
				Hidden: true,
			}),
			altsrc.NewStringFlag(&cli.StringFlag{
				Name:   "token",
				Usage:  "Set the authorization token",
				Hidden: true,
			}),
		},
		Commands: []*cli.Command{
			{
				Name:   "launch",
				Usage:  "Launch a new machine",
				Action: command.Launch,
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:  "name",
						Usage: "Set the name of the machine",
					},
					&cli.BoolFlag{
						Name:  "rm",
						Usage: "Delete machine at the end of the session",
					},
					&cli.BoolFlag{
						Name:  "noattach",
						Usage: "Do not attach to the machine",
					},
				},
			},
			{
				Name:   "list",
				Usage:  "List your machines",
				Action: command.List,
			},
			{
				Name:   "login",
				Usage:  "Login with your username and password",
				Action: command.Login,
			},
			{
				Name:   "shell",
				Usage:  "Attach to a terminal session",
				Action: command.Shell,
			},
			{
				Name:   "delete",
				Usage:  "Delete machine",
				Action: command.Delete,
			},
		},
	}
	app.Before = func(c *cli.Context) error {
		altsrc.InitInputSourceWithContext(app.Flags, altsrc.NewYamlSourceFromFlagFunc("config"))(c)
		return nil
	}

	app.Run(os.Args)
}
