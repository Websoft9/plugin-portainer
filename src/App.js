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

  //获取cookie
  function getCookieValue(cookieName) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === cookieName) {
        return decodeURIComponent(value);
      }
    }
    return null; // 如果没有找到该 Cookie 返回 null
  }

  //验证JWT是否过期
  async function isTokenExpired(token) {
    const decodedToken = jwt_decode(token);
    const currentTime = await cockpit.spawn(["date", "+%s"]);
    //const currentTime = Math.floor(Date.now() / 1000);
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
        const portainer_jwt = authResponse.data.jwt;
        document.cookie = "portainerJWT=" + portainer_jwt + ";path=/";
      } else {
        setShowAlert(true);
        setAlertMessage("Request Portainer JWT Failed.");
      }
    }
  }

  const getData = async () => {
    try {
      const jwtToken = getCookieValue("portainerJWT");
      if (!jwtToken) {
        await getJwt();
      }
      else {
        const isExpired = isTokenExpired(jwtToken);
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
          setIframeSrc(baseURL + content);
        }
      }
      else {
        setIframeSrc(baseURL + "/portainer");
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
