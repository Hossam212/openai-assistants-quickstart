"use client";

import React from "react";
import styles from "./page.module.css"; // use simple styles for demonstration purposes
import Chat from "../../components/chat";

const Home = () => {
  return (
    <main className="flex justify-center items-center h-[100vh] bg-white">
      <div className="max-w-[700px] w-[100%] h-[100%]">
        <Chat />
      </div>
    </main>
  );
};

export default Home;
