#!/bin/bash
cd /data/plugin-cockpit/plugin-portainer/build
yarn build
while [ ! -d "/usr/share/cockpit/portainer" ]; do
  sleep 1
done
cp -r ./* /usr/share/cockpit/portainer/