import { useEffect, useRef, useState } from 'react'
// import reactLogo from './assets/react.svg'
import sendIcon from '/send.svg'
import './App.css'

const ws = new WebSocket("ws://localhost:3000/cable");

interface Message {
  id: number;
  guid: string;
  username: string;
  body: string;
  created_at: string;
  updated_at: string;
  url: string;
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [guid, setGuid] = useState("");
  const [username, setUsername] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const myRef = useRef<any>(null);

  const scrollChat = () => {
    if(myRef.current) {
      myRef.current.scrollTop = myRef.current.scrollHeight;
    }
  }

  const checkImage = (text: string) => {
    return (text.match(/\.(jpeg|jpg|gif|png)$/) != null);
  }

  const getImages = () => {
    const imageListStore = window.localStorage.getItem('image-list');
    if(imageListStore) {
      setImages(JSON.parse(imageListStore));
    }
    
    
  }

  const checkAndSaveImage = (text: string) => {
    if(!checkImage(text)) return;

    const imageListStore = window.localStorage.getItem('image-list');
    let images: string[] = [];

    if(imageListStore) {
      images = JSON.parse(imageListStore);
      if(images.filter(img => img === text).length) return;
    }
    images.push(text);
    setImages(images);
    window.localStorage.setItem('image-list', JSON.stringify(images));
  }

  ws.onopen = () => {
    console.log('connected to the server');
    const currentUid = window.localStorage.getItem('guid');
    const randNum = Math.random().toString(36).substring(2, 15);
    if(!currentUid) {
      setGuid(randNum);
      window.localStorage.setItem('guid', randNum);
    } else {
      setGuid(currentUid);
    }

    ws.send(
      JSON.stringify({
        command: "subscribe",
        identifier: JSON.stringify({
          id: guid,
          channel: "MessagesChannel",
        }),
      })
    );
  };

  const fetchMessages = async () => {
    const response = await fetch("https://ruby-on-rails-chat-api.onrender.com/messages.json");
    const data: Message[] = await response.json();
    setMessages(data.filter(dt => dt.body !== null));
    scrollChat();
  };

  const getUser = () => {
    const currentUid = window.localStorage.getItem('guid');
    const currentUser = window.localStorage.getItem('username');

    if(currentUser && currentUid) {
      setGuid(currentUid);
      setUsername(currentUser);
    }
  }

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === "ping") return;
    if (data.type === "welcome") return;
    if (data.type === "confirm_subscription") return;

    const message = data.message;
    // manually add date for own message
    message.created_at = new Date();

    setMessages([...messages, message]);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const body: string = e.target.message.value;
    e.target.message.value = "";
    if(body.trim().length !== 0) {
      //check if message is an image URL
      checkAndSaveImage(body);

      await fetch("https://ruby-on-rails-chat-api.onrender.com/messages.json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, body, guid }),
      });
    }
  };

  const sendImage = async (url: string) => {
    await fetch("https://ruby-on-rails-chat-api.onrender.com/messages.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, body: url, guid }),
    });
  };

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    const username = e.target.username.value;
    e.target.username.value = "";
    window.localStorage.setItem('username', username);
    setUsername(username);
  };

  useEffect(() => {
    getUser();
    fetchMessages();
    getImages();
  }, []);

  useEffect(() => {
    scrollChat();
  }, [messages]);

  return (
    <>
      {username.trim().length === 0 ? (
        <div className="register-box">
            <div className="title">
                <span>Vite + React + Ruby on Rails Chat App</span>
            </div>
            <form className="register" onSubmit={handleCreateUser}>
              <div className="formgroup">
                <label>Username</label>
                <input className="message-input" type="text" name="username" placeholder="Input your username" />  
              </div>
              <button className="start-button" type="submit">
                Start Chatting
              </button>
            </form>
        </div>
      ) : (
        <div className='chat-container'>
          <div className='chat-wrapper'>
            <div className='sidebar'>
              <div className="user-profile">
                <img className='user-icon' src={`https://api.dicebear.com/9.x/identicon/svg?seed=${username}`} />
                <span className='user-name'>
                  <span>{username}</span>
                  <p>{guid}</p>
                </span>
              </div>
              <h3>Recent Image</h3>
              <div className='recent-images'>
                {images.map((image, key) => <img onClick={() => sendImage(image)} className='recent-image-item' key={key} src={image} />)}
              </div>
            </div>
            <div className="card">
              <div className="chat-header">
                <span>Vite + React + Ruby on Rails Chat App</span>
              </div>
              <div id="message-container" ref={myRef}>
                { messages.map(msg => {
                  const date = new Date(msg.created_at);
                  const isUserMsg = msg.guid === guid;
                  return (
                    <div className={`text-wrapper ${ isUserMsg ? 'align-right' : 'align-left'}`} key={msg.id}>
                      {!isUserMsg && <img className='user-icon' src={`https://api.dicebear.com/9.x/identicon/svg?seed=${msg.username}`} />}
                      <div 
                        className={`text-bubble`} 
                      >
                        { checkImage(msg.body) ? (
                          <img className='gif' src={msg.body} />
                        ) : (
                          <p> {msg.body }</p>
                        )}
                        
                        <span>{`${date.getHours()}:${date.getMinutes()}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSubmit}>
                <input className="message-input" type="text" name="message" placeholder='Type a message or paste an image URL here' />
                <button className="message-button" type="submit">
                  <img src={sendIcon} alt="" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </>
  )
}

export default App
