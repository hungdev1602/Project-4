import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getDatabase,
  set,
  ref,
  push,
  onChildAdded,
  get,
  child,
  remove,
  onChildRemoved,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";
import * as Popper from "https://cdn.jsdelivr.net/npm/@popperjs/core@^2/dist/esm/index.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqXWvl-d5-BQMe8Ol9JHhHfV35fbNRrnw",
  authDomain: "chat-app-36193.firebaseapp.com",
  projectId: "chat-app-36193",
  databaseURL:
    "https://chat-app-36193-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "chat-app-36193.appspot.com",
  messagingSenderId: "147522572708",
  appId: "1:147522572708:web:c0db4cb430176386287131",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); //khởi tạo authentication
const db = getDatabase(app); //tạo database
const dbRef = ref(getDatabase(app));
const chatsRef = ref(db, "chats/");

// ================================================================Tính năng đăng ký ==============================================
// đăng ký xong lưu dự liệu vào database
const formRegister = document.querySelector("#form-register");
// Check xem có tồn tại hay không form đăng ký
if (formRegister) {
  formRegister.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = formRegister.name.value;
    const email = formRegister.email.value;
    const password = formRegister.password.value;

    if (name && email && password) {
      // hàm để đăng ký của firebase
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user; //
          if (user) {
            // user.uid => trả về id duy nhất của user đó và lưu thông tin vào database
            set(ref(db, "users/" + user.uid), {
              name: name,
              email: email,
              password: password,
            }).then(() => {
              window.location.href = "./index.html";
            });
          }
        })
        .catch((error) => {
          console.log(error);
          alert("Tài khoản đã tồn tại");
        });
    } else {
      alert("Hãy điền đầy đủ thông tin");
    }
  });
}

// ================================================================Tính năng đăng nhập ==============================================
const formLogin = document.querySelector("#form-login");
// Check xem có tồn tại hay không form đăng nhập
if (formLogin) {
  formLogin.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = formLogin.email.value;
    const password = formLogin.password.value;

    if (email && password) {
      // hàm để đăng nhập, firebase sẽ tự check email và mật khẩu có đúng hay không, nếu sai vào catch
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          // nếu người dùng tồn tại thì chuyển qua trang chủ
          if (user) {
            window.location.href = "./index.html";
          }
        })
        .catch((error) => {
          alert("Sai mật khẩu hoặc email");
        });
    }
  });
}

// ================================================================Tính năng đăng xuất ==============================================
const buttonLogout = document.querySelector("[button-logout]");
if (buttonLogout) {
  buttonLogout.addEventListener("click", () => {
    // signOut() hàm để đăng xuất
    signOut(auth)
      .then(() => {
        window.location.href = "login.html";
      })
      .catch((error) => {
        console.log(error);
      });
  });
}

// ================================================================Kiểm tra trạng thái đăng nhập hay chưa ==============================================
// onAuthStateChanged() hàm kiểm tra trạng thái đăng nhập, => có nghĩa là check xem có đang đăng nhập tài khoản nào đó không
// nếu đã đăng nhập thì hiện nút đăng xuất (ẩn nút đăng nhập/đăng ký)
// nếu chưa đăng nhập thì ẩn nút đăng xuất (hiện nút đăng nhập/đăng ký)

const buttonLogin = document.querySelector("[button-login]");
const buttonRegister = document.querySelector("[button-register]");
const chat = document.querySelector(".chat");
// nút logout có gọi ở trên rồi
onAuthStateChanged(auth, (user) => {
  if (user) {
    // đã đăng nhập
    const uid = user.uid;
    console.log(`Đã đăng nhập ${uid}`);

    buttonLogout.style.display = "inline-block";
    chat.style.display = "block";
  } else {
    //chưa đăng nhập
    console.log(`Chưa đăng nhập`);

    buttonLogin.style.display = "inline-block";
    buttonRegister.style.display = "inline-block";
  }
});

// ===============================================================Chat cơ bản============================================
// 1) lấy nội dung tin nhắn
// 2) xác định tin nhắn của ai
// 3) lấy id của người đăng nhập hiện tại => auth là object có chứa tất cả thông tin người dùng
// 4) mỗi 1 tin nhắn sẽ được lưu vào database với id riêng biệt, chứa nội dung tin nhắn đó và id người dùng
const sendMessage = document.querySelector("#send-message");
if (sendMessage) {
  // Up ảnh
  // sau khi send ảnh, cachedFileArray sẽ là mảng các bức ảnh mình gửi
  const upload = new FileUploadWithPreview.FileUploadWithPreview(
    "upload-images",
    {
      multiple: true, //up nhiều ảnh
      // maxFileCount: 2, //tôi đa bao nhiêu ảnh
    }
  );

  const url = "https://api.cloudinary.com/v1_1/dv6e72hya/image/upload"; //api lưu ảnh lên cloud
  // https://api.cloudinary.com/v1_1/{user_name}/{image/auto}/upload  => auto là file gì cũng dc
  sendMessage.addEventListener("submit", async (event) => {
    event.preventDefault();

    const content = sendMessage.content.value; // nội dung tin nhắn người gửi
    const userId = auth.currentUser.uid; // lấy id của người hiện tại đang ở trang web
    const images = upload.cachedFileArray; //mảng chứa các hình ảnh người gửi

    const formData = new FormData();

    const arrayLinkImage = []; //mảng lưu link ảnh sau khi đẩy lên cloud

    for (let i = 0; i < images.length; i++) {
      let file = images[i];
      formData.append("file", file);
      formData.append("upload_preset", "umcy3swg");

      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      arrayLinkImage.push(data.url); //lưu vào mảng sau khi có link ảnh
    }

    //lưu tin nhắn của người dùng vào database
    // push để tạo ra 1 id ngẫu nhiên
    // có up nội dung hoặc ảnh, hoặc cả 2
    if ((content || arrayLinkImage.length > 0) && userId) {
      set(push(ref(db, "chats")), {
        content: content,
        userId: userId,
        images: arrayLinkImage,
      });

      sendMessage.content.value = "";
      upload.resetPreviewPanel(); // clear all selected images
    }
  });
}
// ===============================================================Hàm bắt sự kiện xoá 1 tin nhắn============================================
// remove() để xoá
const buttonDeleteChat = (key) => {
  const button = document.querySelector(`button[button-delete="${key}"]`);
  if (button) {
    button.addEventListener("click", () => {
      remove(ref(db, "chats/" + key)); //xoá tin nhắn khỏi database
    });
  }
};
// Phát hiện khi 1 tin nhắn bị xoá
// onChildRemoved()
onChildRemoved(chatsRef, (data) => {
  const key = data.key;
  const elementChatDelete = document.querySelector(`[chat-key="${key}"]`);
  elementChatDelete.remove();
});

// ===============================================================Lấy ra danh sách tin nhắn để hiện thị============================================
// có 2 hàm onValue() và onChildAdded()
// onChildAdded() lợi thế hơn vì mỗi lần có 1 bản ghi mới nó ko load lại toàn bộ bản ghi từ đầu, chỉ load ra data mới
// onValue() thì sẽ load lại toàn bộ bản ghi trong db

// Ngoài ra còn có 2 hàm onChildChanged() => để xem có bản ghi gì thay đổi ko
// onChildRemoved() để xem có bản ghi nào bị xoá ko
const chatBody = document.querySelector(".chat .chat__body");
if (chatBody) {
  const chatsRef = ref(db, "chats");
  // lấy mỗi thông tin tin nhắn
  onChildAdded(chatsRef, (data) => {
    const key = data.key;
    const userId = data.val().userId;
    const content = data.val().content;
    const images = data.val().images;

    // Lấy tên user của tin nhắn đó => tin nhắn đó là ai gửi
    get(child(dbRef, `users/${userId}`)).then((snapshot) => {
      const fullName = snapshot.val().name; //gọi vào database users với id

      // lấy ra được các thông tin tin nhắn thì appendChild vào thẻ html để hiện ra tin nhắn

      const elementChat = document.createElement("div");
      elementChat.setAttribute("chat-key", key);
      let htmlFullName = "";
      let htmlButtonDelete = ""; //nút xoá
      let htmlContent = "";
      let htmlImages = "";

      // check xem để hiện thị tin nhắn bên trái hoặc bên phải
      if (userId === auth.currentUser.uid) {
        // Khi mình gửi tin nhắn sẽ vào đây
        elementChat.classList.add("chat__outgoing");
        // nút xoá dành cho người gửi
        htmlButtonDelete = `
          <button class="button-delete" button-delete="${key}"><i class="fa-regular fa-trash-can"></i></button>
        `;
      } else {
        // Khi người khác gửi tin nhắn sẽ vào đây
        htmlFullName = `
          <div class="chat__incoming-name">${fullName}</div>
        `;
        elementChat.classList.add("chat__incoming");
      }

      // Check xem có nội dung tin nhắn ko
      if (content) {
        htmlContent += `
        <div class="chat__content">
          ${content}
        </div>`;
      }

      // check xem có ảnh ko
      if (images) {
        htmlImages += `
        <div class="inner-images">`;

        for (const image of images) {
          htmlImages += `
          <img src="${image}" />
          `;
        }

        htmlImages += `
        </div>`;
      }

      elementChat.innerHTML = `
        ${htmlFullName}
        ${htmlContent}
        ${htmlImages}
        ${htmlButtonDelete}
      `;
      chatBody.appendChild(elementChat);

      new Viewer(elementChat);

      buttonDeleteChat(key); //để xoá 1 tin nhắn cần lấy id của tin nhắn đó trong database => key chính là nó
    });
  });
}

// ============================================== Chèn icon =========================================================
const emojiPicker = document.querySelector("emoji-picker");
if (emojiPicker) {
  emojiPicker.addEventListener("emoji-click", (event) => {
    const icon = event.detail.unicode; //lấy ra icon mà người dùng click
    if (icon) {
      const inputChat = document.querySelector(
        `.chat__foot form input[name="content"]`
      );
      console.log(inputChat);
      inputChat.value = inputChat.value + icon; // chèn icon vào tin nhắn
    }
  });
}

// ============================================== Hiện thị popup icon =========================================================
const buttonIcon = document.querySelector(".button-icon");
if (buttonIcon) {
  const tooltip = document.querySelector(".tooltip");
  Popper.createPopper(buttonIcon, tooltip);

  buttonIcon.onclick = () => {
    tooltip.classList.toggle("shown");
  };

  window.addEventListener("click", function (e) {
    // khi ấn ra ngoài tooltip ko chứa thẻ mình ấn và buttonIcon cũng ko chứa cái thẻ mà mình ấn => xong rồi sẽ ẩn đi emoji
    // nếu ko thêm !buttonIcon.contains(e.target) thì khi click vào buttonIcon nó cũng tính là click bên ngoài, vì tooltip ko có con là buttonIcon
    if (!tooltip.contains(e.target) && !buttonIcon.contains(e.target)) {
      // Clicked outside the box
      tooltip.classList.remove("shown");
    }
  });
}
