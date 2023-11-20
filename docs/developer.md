# Developer

## Technology Stack

**Frontend**  

- ui: [react-bootstrap](https://react-bootstrap.github.io/)
- js framework: [Create React App](https://create-react-app.dev/docs/documentation-intro)
- template: no use

**Backend API**  

- portainer: Automatic login to Portainer
- cockpit: this is for running command at host machine

Related classes:

- src/App.js


## Build and Test

You should install [Websoft9](https://github.com/Websoft9/websoft9) for testing, then build it:

```
git clone https://github.com/Websoft9/plugin-portainer
cd plugin-portainer
yarn build && cp -r ./build/* /usr/share/cockpit/portainer/
```
