import axios from 'axios';
import "bootstrap/dist/css/bootstrap.min.css";
import cockpit from 'cockpit';
import jwt_decode from 'jwt-decode';
import { useEffect, useState } from "react";
import { Alert } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import "./App.css";

function App() {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [iframeKey, setIframeKey] = useState(Math.random());
  const [alertMessage, setAlertMessage] = useState("");

  const host = window.location.host;
  const baseURL = window.location.protocol + "//" + (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(host) ? host.split(":")[0] : host);
  let portainer_jwt = window.localStorage.getItem("portainer.JWT"); //获取portainer.JWT的值

  //验证JWT是否过期
  function isTokenExpired(token) {
    const decodedToken = jwt_decode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
  }

  //获取Portainer JWT
  const getJwt = async () => {
    let response = await cockpit.http({ "address": "websoft9-appmanage", "port": 5000 }).get("/AppSearchUsers", { "plugin_name": "portainer" });
    response = JSON.parse(response);
    if (response.ResponseData) {
      var userName = response.ResponseData.user?.user_name;
      var userPwd = response.ResponseData.user?.password;

      const authResponse = await axios.post(baseURL + "/portainer/api/auth", {
        username: userName,
        password: userPwd,
      });
      if (authResponse.status === 200) {
        portainer_jwt = "\"" + authResponse.data.jwt + "\"";
        window.localStorage.setItem('portainer\.JWT', portainer_jwt);
      } else {
        setShowAlert(true);
        setAlertMessage("Request Portainer JWT Failed.");
      }
    }
  }

  const getData = async () => {
    try {
      if (!portainer_jwt) { //如果不存在，通过API获取JWT
        await getJwt();
      }
      else { //如果存在，就验证是否已经过期
        const isExpired = isTokenExpired(portainer_jwt);
        if (isExpired) { //如果已经过期，重新生成JWT
          await getJwt();
        }
      }

      setIframeKey(Math.random());
      var newHash = window.location.hash;
      if (newHash.includes("/portainer/#!/")) {
        var index = newHash.indexOf("#");
        if (index > -1) {
          var content = newHash.slice(index + 1);
          setIframeSrc(baseURL + content + "?portainer_jwt=" + portainer_jwt.replace(/"/g, ''));
        }
      }
      else {
        setIframeSrc(baseURL + "/portainer?portainer_jwt=" + portainer_jwt.replace(/"/g, ''));
      }
    }
    catch (error) {
      setShowAlert(true);
      setAlertMessage("Call Portainer Page Error.");
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
      {iframeKey && iframeSrc ? (
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
