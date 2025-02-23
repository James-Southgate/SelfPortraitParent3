// src/components/Navigation.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';  // added useNavigate
import headerLogo from '../assets/headerlogo2.png';
import userIcon from '../assets/user.png';

function Navigation({ isLoggedIn, isAdmin, username, setIsLoggedIn }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const burgerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();  // initialize navigate

  const handleLogout = () => {
    fetch('/api/staff-logout', { method: 'POST', credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setIsLoggedIn(false);  // Now defined
          navigate('/staff-login');
        }
      })
      .catch(console.error);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (burgerRef.current && !burgerRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // Possibly hide the nav on certain paths
  const hideNavPaths = [
    '/school-portal-login',
    '/contact-form',
    '/staff-login',
  ];
  if (hideNavPaths.includes(location.pathname)) return null;

  // If not logged in, don’t show the nav
  if (!isLoggedIn) return null;

  return (
    <header className="header-container">
      <div className="left-container">
        <img className="header-logo"
          src={headerLogo}
          alt="Header Logo"
          style={{ height: '40px', marginRight: '1rem' }}
        />
        <nav className="nav-links">
        <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active-nav-link' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to="/orders"
            className={`nav-link ${location.pathname === '/orders' ? 'active-nav-link' : ''}`}
          >
            Order List
          </Link>
          <Link
            to="/process-slider"
            className={`nav-link ${location.pathname === '/process-slider' ? 'active-nav-link' : ''}`}
          >
            Process Slider
          </Link>
          <Link
            to="/artwork-management"
            className={`nav-link ${location.pathname === '/artwork-management' ? 'active-nav-link' : ''}`}
          >
            Artwork Mgmt
          </Link>
          {isAdmin && (
            <Link
              to="/user-management"
              className={`nav-link ${location.pathname === '/user-management' ? 'active-nav-link' : ''}`}
            >
              User Mgmt
            </Link>
          )}
        </nav>
      </div>
      <div className="right-container">
        <div className="user-info">
          <img src={userIcon} alt="User Icon" className="user-icon" />
          <span className="username">{username}</span>
        </div>
        <div className="burger-container" ref={burgerRef}>
          <div
            className="burger-icon"
            onClick={() => setDropdownOpen(prev => !prev)}
            style={{ cursor: 'pointer' }}
          >
            ☰
          </div>
          {dropdownOpen && (
              <div
                className="dropdown-menu"
                style={{ display: 'block' }}  // Ensure the menu is displayed when rendered
              >
                <div className="dropdown-item" onClick={() => {/* handle settings */}}>
                Settings
              </div>
              <div className="dropdown-item" onClick={() => handleLogout()}>
                Log Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navigation;