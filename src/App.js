import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import Spinner from "react-bootstrap/Spinner";
import "./App.css";

function App() {
  const [portainerJWT, setPortainerJWT] = useState(null);
  const [portainerHomePage, setPortainerHomePage] = useState(null);
  const [iframeSrc, setIframeSrc] = useState(null);

  const getData = async () => {
    try {
      let jwt = window.localStorage.getItem("portainer.JWT"); //获取存储在本地的JWT数据

      if (jwt === null) {
        const response = await axios.get("../myapps/config.json"); //从项目下读取配置文件
        if (response.status === 200) {
          let config = response.data.PORTAINER;
          const {
            PORTAINER_USERNAME,
            PORTAINER_PASSWORD,
            PORTAINER_AUTH_URL,
            PORTAINER_HOME_PAGE,
          } = config;
          setPortainerHomePage(PORTAINER_HOME_PAGE);

          //调用portainer的登录API，模拟登录
          const authResponse = await axios.post(PORTAINER_AUTH_URL, {
            username: PORTAINER_USERNAME,
            password: PORTAINER_PASSWORD,
          });
          if (authResponse.status === 200) {
            jwt = '"' + authResponse.data.jwt + '"';
            setPortainerJWT(jwt);
            window.localStorage.setItem("portainer.JWT", jwt); //关键是将通过API登录后获取的jwt，存储到本地localStorage
          } else {
            console.log("Error:", authResponse);
          }
        } else {
          console.log("Error:", response);
        }
      } else {
        const response = await axios.get("../myapps/config.json"); //从项目下读取配置文件
        if (response.status === 200) {
          let config = response.data.PORTAINER;
          const { PORTAINER_HOME_PAGE } = config;
          setPortainerHomePage(PORTAINER_HOME_PAGE);
        } else {
          console.log("Error:", response);
        }
        setPortainerJWT(jwt);
      }
    } catch (error) {
      console.log("Error:", error);
    }
  };

  function handleHashChange() {
    var newHash = window.location.hash;
    if (newHash.includes("/portainer/#!/")) {
      var index = newHash.indexOf("#");
      if (index > -1) {
        var content = newHash.slice(index + 1);
        setIframeSrc(content);
      }
    }
  }

  useEffect(() => {
    getData();
    let currentHash = window.location.hash;
    if (currentHash.includes("/portainer/#!/")) {
      var index = currentHash.indexOf("#");
      if (index > -1) {
        var content = currentHash.slice(index + 1);
        setIframeSrc(content);
      }
    }
    else {
      setIframeSrc(portainerHomePage);
    }
    window.addEventListener("hashchange", handleHashChange, true);
    return () => {
      window.removeEventListener("hashchange", handleHashChange, true);
    };
  }, []);

  return (
    <>
      {portainerJWT && portainerHomePage ? (
        <div class="myPortainer">
          <iframe id="myPortainer" title="portainer" src={iframeSrc || portainerHomePage} />
        </div>
      ) : (
        <div className="d-flex align-items-center justify-content-center m-5">
          <Spinner animation="border" variant="secondary" />
        </div>
      )}
    </>
  );
}

export default App;
