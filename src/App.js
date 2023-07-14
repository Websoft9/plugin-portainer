import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";
import cockpit from 'cockpit';
import { useEffect, useState } from "react";
import { Alert } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import "./App.css";

function App() {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [iframeKey, setIframeKey] = useState(Math.random());
  const [alertMessage, setAlertMessage] = useState("");

  var baseURL;

  const getData = async () => {
    let protocol = window.location.protocol;
    let host = window.location.host;
    let portainer_jwt = window.localStorage.getItem("portainer.JWT");
    baseURL = protocol + "//" + (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host) ? host.split(":")[0] : host);

    try {
      if (!portainer_jwt) {
        let data = await cockpit.spawn(["docker", "inspect", "-f", "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}", "websoft9-appmanage"]);
        let IP = data.trim();
        if (IP) {
          let response = await cockpit.http({ "address": IP, "port": 5000 }).get("/AppSearchUsers", { "plugin_name": "portainer" });
          response = JSON.parse(response);
          if (response.ResponseData) {
            var userName = response.ResponseData.user?.user_name;
            var userPwd = response.ResponseData.user?.password;

            const authResponse = await axios.post(baseURL + "/portainer/api/auth", {
              username: userName,
              password: userPwd,
            });
            if (authResponse.status === 200) {
              let jwt = "\"" + authResponse.data.jwt + "\"";
              window.localStorage.setItem('portainer\.JWT', jwt);
            } else {
              setShowAlert(true);
              setAlertMessage("Auth Portainer Error.")
            }
          }
        }
      }
      setIframeKey(Math.random());
      var newHash = window.location.hash;
      if (newHash.includes("/portainer/#!/")) {
        var index = newHash.indexOf("#");
        if (index > -1) {
          var content = newHash.slice(index + 1);
          setIframeKey(Math.random());
          setIframeSrc(baseURL + content + "?portainer_jwt=" + portainer_jwt.replace(/"/g, ''));
        }
      }
      else {
        setIframeSrc(baseURL + "/portainer?portainer_jwt=" + portainer_jwt.replace(/"/g, ''));
      }
    }
    catch (error) {
      setShowAlert(true);
      setAlertMessage("Call Portainer Page Error.")
    }
  }

  const handleHashChange = () => {
    var newHash = window.location.hash;
    if (newHash.includes("/portainer/#!/")) {
      var index = newHash.indexOf("#");
      if (index > -1) {
        var content = newHash.slice(index + 1);
        setIframeKey(Math.random());
        setIframeSrc(baseURL + content);
      }
    }
  }

  useEffect(async () => {
    await getData();

    window.addEventListener("hashchange", handleHashChange, true);
    return () => {
      window.removeEventListener("hashchange", handleHashChange, true);
    };
  }, []);

  return (
    <>
      {iframeSrc ? (
        <div class="myPortainer">
          <iframe key={iframeKey} title="portainer" src={iframeSrc} />
        </div>
      ) : (
        <div className="d-flex align-items-center justify-content-center m-5" style={{ flexDirection: "column" }}>
          <Spinner animation="border" variant="secondary" className='mb-5' />
          {showAlert && <Alert variant="danger" className="my-2">
            {alertMessage}
          </Alert>}
        </div>
      )}
    </>
  );
}

export default App;
