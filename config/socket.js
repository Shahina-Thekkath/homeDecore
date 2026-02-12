import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server);

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.join("public");

    //join room
    socket.on("joinRoom", (data) => {
      if (!data) return;

      if (data.role === "admin") {
        socket.join("admin");
        console.log("Admin joined admin room");
      }

      if (data.role === "user" && data.userId) {
        socket.join(`user_${data.userId}`);
        console.log(`User joined room user_${data.userId}`);
      }

      if (data.role === "checkout") {
        socket.join("checkout_users", () => {
          console.log("User joined checkout room");
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket not initialized");
  }
  return io;
};
