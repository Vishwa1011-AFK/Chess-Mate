import React from "react";
import "./UserTile.css";

const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const UserTile = ({ name, timeLeft, capturedPieces, side, color }) => {
  return (
    <div className={`user-tile ${side}`}>
      <div className="user-info">
        <span className="user-name">{name}</span>
        <span className="user-color">({color})</span>
      </div>
      <div className="user-timer">{formatTime(timeLeft)}</div>
    </div>
  );
};


export default UserTile;