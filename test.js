const imageUrl = "https://storage.googleapis.com/biryani-darbar-770a5.appspot.com/1732454422660-mutton biryani.jpg";
const fileName = imageUrl.split("/").pop(); // Extracts "1732454422660-mutton biryani.jpg"
const category = "Chicken Curry";
const file = `${category}/${fileName}`;
console.log(file);
