#!/bin/bash
yarn build
rm -rf /usr/share/cockpit/portainer/*
cp -r /data/plugin-cockpit/plugin-portainer/build/* /usr/share/cockpit/portainer/
