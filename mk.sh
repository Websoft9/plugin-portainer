#!/bin/bash
cd /data/cockpit-plugins/plugin-portainer/build
yarn build
while [ ! -d "/usr/share/cockpit/container" ]; do
  sleep 1
done
cp -r ./* /usr/share/cockpit/container/
