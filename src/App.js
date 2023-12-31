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
  const [jwtLoaded, setJwtLoaded] = useState(false);

  const baseURL = `${window.location.protocol}//${window.location.hostname}`;

  //获取Portainer JWT
  const getJwt = async () => {
    try {
      var script = "docker exec -i websoft9-apphub apphub getconfig --section portainer";
      let content = (await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" })).trim();
      content = JSON.parse(content);

      const userName = content.user_name;
      const userPwd = content.user_pwd;

      if (!userName || !userPwd) {
        setShowAlert(true);
        setAlertMessage("Portainer Username or Password is empty.");
        return;
      }

      const authResponse = await axios.post(baseURL + "/w9deployment/api/auth", {
        username: userName,
        password: userPwd,
      });
      if (authResponse.status === 200) {
        const portainer_jwt = authResponse.data.jwt;
        document.cookie = "portainerJWT=" + portainer_jwt + ";path=/";
        setJwtLoaded(true);
      } else {
        setShowAlert(true);
        setAlertMessage("Auth Portainer Error.");
      }
    }
    catch (error) {
      setShowAlert(true);
      const errorText = [error.problem, error.reason, error.message]
        .filter(item => typeof item === 'string')
        .join(' ');

      if (errorText.includes("permission denied")) {
        setAlertMessage("Permission denied.");
      }
      else {
        setAlertMessage(errorText || "Login Portainer Error.");
      }
    }
  }

  const autoLogin = async () => {
    try {
      await getJwt();

      setIframeKey(Math.random());
      var newHash = window.location.hash;
      if (newHash.includes("/w9deployment/#!/")) {
        var index = newHash.indexOf("#");
        if (index > -1) {
          var content = newHash.slice(index + 1);
          setIframeSrc(baseURL + content);
        }
      }
      else {
        setIframeSrc(baseURL + "/w9deployment/");
      }
    }
    catch (error) {
      setShowAlert(true);
      setAlertMessage("Call Portainer Page Error.");
    }
  }

  const handleHashChange = () => {
    var newHash = window.location.hash;
    if (newHash.includes("/w9deployment/#!/")) {
      var index = newHash.indexOf("#");
      if (index > -1) {
        var content = newHash.slice(index + 1);
        setIframeKey(Math.random());
        setIframeSrc(baseURL + content);
      }
    }
  }

  useEffect(async () => {
    await autoLogin();

    window.addEventListener("hashchange", handleHashChange, true);

    return () => {
      window.removeEventListener("hashchange", handleHashChange, true);
    };
  }, []);

  return (
    <>
      {iframeKey && iframeSrc && jwtLoaded ? (
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
