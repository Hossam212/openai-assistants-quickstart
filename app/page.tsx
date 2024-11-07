"use client";
import Aside from "./components/nav/aside";
import Navbar from "./components/nav/navbar";
import Chat from "./components/chat";

const testUser = {
  name: "User Name",
  email: "email",
};

const Home = () => {
  return (
    <main className="flex bg-white">
      <Aside user={testUser} />
      <div className="flex flex-col h-screen w-[calc(100vw-280px)]">
        <Navbar />
        <Chat />
      </div>
    </main>
  );
};

export default Home;
