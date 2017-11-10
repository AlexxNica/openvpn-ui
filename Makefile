IMAGE ?= $(shell basename `pwd`)
TAG ?= latest
PORT = 9000

build:
	docker build -t $(IMAGE):$(TAG) .

run: build
	docker run -it -p $(PORT):$(PORT) --rm $(IMAGE):$(TAG)

up:
	cp config.yml.dist config.yml
	docker-compose up

down: 
	docker-compose down -v
