HYPER_VERSION=0.7.0

BUILD_FLAGS=-ldflags "-X github.com/hyperhq/hyperd/utils.VERSION=$(HYPER_VERSION)"

build:
	go build ${BUILD_FLAGS}

run:
	go run ${BUILD_FLAGS} main.go