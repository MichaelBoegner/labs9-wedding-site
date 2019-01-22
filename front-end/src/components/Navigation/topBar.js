import React, { Component } from "react";
import { Link } from 'react-router-dom';

import "./topBar.css";

import ProfilePic from './nav';
// import LandingPageButtons from './LandingButtons';
import SignupLogin from '../Buttons/SignupLoginButtons';
import LandingButtonsExp from '../Buttons/LandingButtonsExp';


const StickyTop = () => {
  return (
    <div className="overall">
      { /*<div className="overall"> */}
      <div className="leftNav">
        <ProfilePic />
        {/* <LandingPageButtons /> */}
        <LandingButtonsExp />
      </div>
      <div>
        <Link to='/'>
          <h1 className="siteName">Be loved</h1> 
        </Link>
      </div>
      <div className="rightNav">
        <SignupLogin />
        { /* </div> */}
      </div>
    </div>
  );
};

export default StickyTop;