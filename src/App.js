import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";
import cockpit from 'cockpit';
import { useEffect, useState } from "react";
import { Alert } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import "./App.css";

function App() {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [showAlert, setShowAlert] = useState(false); //用于是否显示错误提示
  const [alertMessage, setAlertMessage] = useState("");//用于显示错误提示消息

  var baseURL;

  const getData = async () => {
    let protocol = window.location.protocol;
    let host = window.location.host;
    baseURL = protocol + "//" + (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host) ? host.split(":")[0] : host);

    cockpit.spawn(["docker", "inspect", "-f", "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}", "websoft9-appmanage"])
      .then(function (data) {
        let IP = data.trim();
        if (IP) {
          cockpit.http({ "address": IP, "port": 5000 })
            .get("/AppSearchUsers", { "plugin_name": "portainer" }).then(function (response) {
              response = JSON.parse(response);
              if (response.ResponseData) {
                var userName = response.ResponseData.user?.user_name;
                var userPwd = response.ResponseData.user?.password;

                axios.post(baseURL + "/portainer/api/auth", {
                  username: userName,
                  password: userPwd,
                }).then(authResponse => {
                  if (authResponse.status === 200) {
                    setIframeSrc(baseURL + "/portainer?portainer_jwt=" + authResponse.data.jwt);
                  } else {
                    setShowAlert(true);
                    setAlertMessage("Auth Portainer Error.")
                  }
                }).catch(error => {
                  setShowAlert(true);
                  setAlertMessage("Call Portainer API Error.")
                });
              }
            }).catch((error) => {
              setShowAlert(true);
              setAlertMessage("Get Portainer User Error.")
            });
        }
      })
      .catch((error) => {
        setShowAlert(true);
        setAlertMessage("Call websoft9-appmanage IP Error.")
      });
  };

  const handleHashChange = () => {
    var newHash = window.location.hash;
    if (newHash.includes("/portainer/#!/")) {
      var index = newHash.indexOf("#");
      if (index > -1) {
        var content = newHash.slice(index + 1);
        setIframeSrc(baseURL + content);
      }
    }
  }

  useEffect(() => {
    getData();
    window.addEventListener("hashchange", handleHashChange, true);
    return () => {
      window.removeEventListener("hashchange", handleHashChange, true);
    };
  }, []);

  return (
    <>
      {iframeSrc ? (
        <div class="myPortainer">
          <iframe id="myPortainer" title="portainer" src={iframeSrc} />
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
