import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import cockpit from 'cockpit';
import { useCallback, useEffect, useState } from "react";
import { Alert } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import "./App.css";

function App() {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [iframeKey, setIframeKey] = useState(Math.random());
  const [alertMessage, setAlertMessage] = useState("");
  const [jwtLoaded, setJwtLoaded] = useState(false);
  const [listenPort, setListenPort] = useState(null);

  const getNginxConfig = useCallback(async () => {
    try {
      const script = "docker exec -i websoft9-apphub apphub getconfig --section nginx_proxy_manager";
      let content = (await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" })).trim();
      content = JSON.parse(content);

      if (content && content.listen_port) {
        setListenPort(content.listen_port);
      } else {
        setShowAlert(true);
        setAlertMessage("Nginx Listen Port Not Set.");
      }
    } catch (error) {
      setShowAlert(true);
      // setAlertMessage("Get Nginx Listen Port Error:" + error.message || "Get Nginx Listen Port Error");

      const errorText = [error.problem, error.reason, error.message]
        .filter(item => typeof item === 'string')
        .join(' ');

      if (errorText.includes("permission denied")) {
        setAlertMessage("Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
      }
      else {
        setAlertMessage(errorText || "Get Nginx Listen Port Error");
      }
    }
  }, []);

  const getJwt = useCallback(async (baseURL) => {
    try {
      const script = "docker exec -i websoft9-apphub apphub getconfig --section portainer";
      let content = (await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" })).trim();
      content = JSON.parse(content);

      const userName = content.user_name;
      const userPwd = content.user_pwd;

      if (!userName || !userPwd) {
        setShowAlert(true);
        setAlertMessage("Portainer Username or Password is empty.");
        return;
      }

      const authResponse = await axios.post(`${baseURL}/w9deployment/api/auth`, {
        username: userName,
        password: userPwd,
      });

      if (authResponse.status === 200) {
        const portainer_jwt = authResponse.data.jwt;
        document.cookie = "portainer_api_key=" + portainer_jwt + ";path=/";
        setJwtLoaded(true);
      } else {
        setShowAlert(true);
        setAlertMessage("Auth Portainer Error.");
      }
    } catch (error) {
      setShowAlert(true);
      const errorText = [error.problem, error.reason, error.message]
        .filter(item => typeof item === 'string')
        .join(' ');

      if (errorText.includes("permission denied")) {
        setAlertMessage("Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
      }
      else {
        setAlertMessage(errorText || "Login Portainer Error.");
      }
    }
  }, []);


  const autoLogin = useCallback(async (baseURL) => {
    try {
      await getJwt(baseURL);

      setIframeKey(Math.random());
      const newHash = window.location.hash;
      if (newHash.includes("/w9deployment/#!/")) {
        const index = newHash.indexOf("#");
        if (index > -1) {
          const content = newHash.slice(index + 1);
          setIframeSrc(`${baseURL}${content}`);
        }
      } else {
        setIframeSrc(`${baseURL}/w9deployment/`);
      }
    } catch (error) {
      setShowAlert(true);
      setAlertMessage("Call Portainer Page Error: " + (error.message || ""));
    }
  }, [getJwt]);

  const handleHashChange = useCallback(() => {
    if (!listenPort) return;

    const newHash = window.location.hash;
    if (newHash.includes("/w9deployment/#!/")) {
      const index = newHash.indexOf("#");
      if (index > -1) {
        const content = newHash.slice(index + 1);
        setIframeKey(Math.random());
        setIframeSrc(`${window.location.protocol}//${window.location.hostname}:${listenPort}${content}`);
      }
    }
  }, [listenPort]);


  useEffect(() => {
    if (listenPort) {
      const baseURL = `${window.location.protocol}//${window.location.hostname}:${listenPort}`;
      autoLogin(baseURL);
    }
  }, [listenPort, autoLogin]);

  // 获取 Nginx 配置
  useEffect(() => {
    getNginxConfig();
  }, [getNginxConfig]);

  // 监听 hash 变化
  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange, true);

    return () => {
      window.removeEventListener("hashchange", handleHashChange, true);
    };
  }, [handleHashChange]);

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