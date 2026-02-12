const socket = io();

        socket.on("connect", () => {
            console.log("USER SOCKET CONNECTED:", socket.id);

            <%if (locals.user && locals.user._id) {%>
              socket.emit("joinRoom", { role: "user", userId: "<%= user._id %>" })              
            <%}%>

        });

        <% if (locals.user && locals.user._id) { %>
        socket.on("user:blocked", (data) => {
            alert(data.message);
            window.location.href = "/login"; // force logout
        });

        socket.on("user:unblocked", (data) => {
            alert(data.message);
            location.reload(); // refresh page so actions work
        });
    <% } %>