"use client";

import React from "react";
import Chat from "../../components/chat";

const Home = () => {
  return (
    <main className="flex justify-center items-center h-full w-full bg-[#f7f7f7]">
      <div className="w-full h-full p-6">
        <Chat />
      </div>
    </main>
  );
};

export default Home;
