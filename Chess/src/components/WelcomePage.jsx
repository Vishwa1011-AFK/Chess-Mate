import React from 'react';
import './WelcomePage.css'; // Import your CSS file for styling
import chessImage from '../assets/images/chess_image.jpeg'; 

const WelcomePage = () => {
  return (
    <div className="welcome-container">
      <h1 className="welcome-title">Welcome to Chess-Mate!</h1>
      <p className="welcome-intro">
        Discover the world of chess where strategy meets fun! Whether you're a 
        seasoned grandmaster or a curious beginner, Chess-Mate offers an 
        engaging platform for players of all levels. Join us to challenge 
        opponents, sharpen your skills, and immerse yourself in the art 
        of chess.
      </p>
      <img src={chessImage} alt="Chess Board" className="welcome-image" />
      <button className="start-button">
        Get Started
      </button>
      <p className="footer">
        &copy; {new Date().getFullYear()} Chess-Mate. All rights reserved.
      </p>
    </div>
  );
};

export default WelcomePage;
