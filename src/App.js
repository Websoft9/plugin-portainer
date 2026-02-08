import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import cockpit from 'cockpit';
import jwtDecode from 'jwt-decode';
import { useCallback, useEffect, useState } from "react";
import { Alert } from 'react-bootstrap';
import Spinner from 'react-bootstrap/Spinner';
import "./App.css";

function App() {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [iframeKey, setIframeKey] = useState(Math.random());
  const [alertMessage, setAlertMessage] = useState("");
  const [listenPort, setListenPort] = useState(null);
  const [countdown, setCountdown] = useState(null); // For SSO failure countdown

  const getNginxConfig = useCallback(async () => {
    try {
      const script = "apphub getconfig --section nginx_proxy_manager";
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
      const script = "apphub getconfig --section portainer";
      let content = (await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" })).trim();
      content = JSON.parse(content);

      const userName = content.user_name;
      const userPwd = content.user_pwd;

      if (!userName || !userPwd) {
        throw new Error("Portainer Username or Password is empty.");
      }

      const authResponse = await axios.post(`${baseURL}/w9deployment/api/auth`, {
        username: userName,
        password: userPwd,
      });

      if (authResponse.status === 200) {
        // Explicitly set JWT cookie for reliable authentication
        const portainer_jwt = authResponse.data.jwt;
        document.cookie = `portainer_jwt=${portainer_jwt}; path=/; SameSite=Strict; max-age=28800`;
        // max-age=28800 = 8 hours (Portainer default token lifetime)
        
        // Track token expiry for auto-refresh
        try {
          const decoded = jwtDecode(portainer_jwt);
          const expiryTime = decoded.exp * 1000; // Convert to milliseconds
          sessionStorage.setItem('portainer_token_expiry', expiryTime);
          console.log('Token expiry tracked:', new Date(expiryTime).toLocaleString());
        } catch (decodeError) {
          console.warn('Failed to decode JWT for expiry tracking:', decodeError);
        }
        return true; // Success
      } else {
        throw new Error("Auth Portainer Error.");
      }
    } catch (error) {
      const errorText = [error.problem, error.reason, error.message]
        .filter(item => typeof item === 'string')
        .join(' ');

      if (errorText.includes("permission denied")) {
        throw new Error("Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
      } else {
        throw new Error(errorText || "Login Portainer Error.");
      }
    }
  }, []);


  const autoLogin = useCallback(async (baseURL) => {
    let ssoSuccess = false;
    
    try {
      // Attempt SSO authentication (best-effort)
      await getJwt(baseURL);
      ssoSuccess = true;
    } catch (error) {
      // Log error but DON'T block user from accessing Portainer
      console.warn('SSO authentication failed:', error);
      ssoSuccess = false;
      
      // Show countdown before redirecting to Portainer login page
      setShowAlert(true);
      setCountdown(3);
      setAlertMessage("Single Sign-On failed. Redirecting to Portainer login in 3 seconds...");
      
      // Start countdown
      let count = 3;
      const countdownInterval = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count > 0) {
          setAlertMessage(`Single Sign-On failed. Redirecting to Portainer login in ${count} second${count > 1 ? 's' : ''}...`);
        }
      }, 1000);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        clearInterval(countdownInterval);
        setShowAlert(false); // Hide error after redirect
        setCountdown(null);
      }, 3000);
    }
    
    // ALWAYS redirect to Portainer regardless of SSO result
    // Wait for countdown to finish if SSO failed
    await new Promise(resolve => setTimeout(resolve, ssoSuccess ? 0 : 3100));
    
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

  // Token 刷新机制：每 5 分钟检查一次，到期前 5 分钟自动刷新
  useEffect(() => {
    if (!listenPort) return;

    const checkAndRefresh = () => {
      const expiry = sessionStorage.getItem('portainer_token_expiry');
      if (!expiry) {
        console.log('No token expiry tracked, skipping refresh check');
        return;
      }
      
      const now = Date.now();
      const expiryTime = Number(expiry);
      const fiveMinutes = 5 * 60 * 1000;
      
      // Refresh token if expiring within 5 minutes
      if (now + fiveMinutes >= expiryTime) {
        console.log('Token expiring soon, refreshing...');
        const baseURL = `${window.location.protocol}//${window.location.hostname}:${listenPort}`;
        autoLogin(baseURL);
      } else {
        const timeUntilExpiry = expiryTime - now;
        const minutesRemaining = Math.floor(timeUntilExpiry / 60000);
        console.log(`Token valid for ${minutesRemaining} more minutes`);
      }
    };
    
    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);
    
    // Also check immediately on mount
    checkAndRefresh();
    
    return () => clearInterval(interval);
  }, [listenPort, autoLogin]);

  return (
    <>
      {showAlert && (
        <Alert 
          variant={countdown !== null ? "warning" : "danger"} 
          className="position-fixed top-0 start-50 translate-middle-x mt-3" 
          style={{ zIndex: 9999, maxWidth: '600px' }}
        >
          <div className="d-flex align-items-center">
            {countdown !== null && <Spinner animation="border" size="sm" className="me-2" />}
            <span>{alertMessage}</span>
          </div>
        </Alert>
      )}
      
      {iframeKey && iframeSrc ? (
        <div class="myPortainer">
          <iframe key={iframeKey} title="portainer" src={iframeSrc} />
        </div>
      ) : (
        <div className="d-flex align-items-center justify-content-center m-5" style={{ flexDirection: "column" }}>
          <Spinner animation="border" variant="secondary" className='mb-5' />
        </div>
      )}
    </>
  );
}

export default App;