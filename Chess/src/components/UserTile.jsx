import React from "react";
import CapturedPieces from "./CapturedPieces";
import "./UserTile.css";

const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const UserTile = ({ name, timeLeft, capturedPieces, side }) => {
  return (
    <div className={`user-tile ${side}`}>
      <div className="user-info">
        <div className="user-name">{name}</div>
        <div className="user-timer">{formatTime(timeLeft)}</div>
      </div>
      <div className="user-captured">
        <CapturedPieces capturedPieces={capturedPieces} side={side} />
      </div>
    </div>
  );
};

export default UserTile;