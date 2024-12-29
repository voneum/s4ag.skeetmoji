import { onMount,createSignal, onCleanup, Show } from 'solid-js';
import { Jetstream } from "./Jetstream";
import { BSkyApi_Record } from './BSkyApi_Record';

import styles from './SkeetMoji.module.css';
import { JetstreamDetail } from './JetstreamDetail';
import { SVGs } from './SVGs';
import toast, { Toaster } from 'solid-toast';
import { EmojiPhysics } from './EmojiPhysics';


export const SkeetMoji = () => {

  let elHelpDialog: HTMLDialogElement;
  let elMain: HTMLElement;
  let elSkeetDivLeft: HTMLDivElement;
  let elSkeetDivRight: HTMLDivElement;
  let emojiPhysics: EmojiPhysics;

  let toastId: string = "";

  // Emoji regex pattern
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  let emojiPosts = 0;

  //let elHtmlDivElements: HTMLDivElement[] = [];

  const [messageCount_GetterFn, messageCount_SetterFn] = createSignal<number>(0);
  const [dataReceived_GetterFn, dataReceived_SetterFn] = createSignal<number>(0);
  const [emojiMessageCount_GetterFn, emojiMessageCount_SetterFn] = createSignal<number>(0);
  const [screenWidth_GetterFn, screenWidth_SetterFn] = createSignal<number>(0);


  const [socketOpen_GetterFn, socketOpen_SetterFn] = createSignal<boolean>(false);
  

  const wantedCollections = [
    "app.bsky.feed.post", 
    // "app.bsky.feed.like",
    // "app.bsky.feed.repost", //Represents repost events (similar to retweets on Twitter).
    // "app.bsky.feed.follow", //Represents follow actions (users following others).
    // "app.bsky.feed.block", //Represents block events (when users block others).
    // "app.bsky.feed.mute", //Represents mute events (when users mute others).
    "app.bsky.feed.reply", //Represents reply events (responses to posts).
  ];

  const jetstream = new Jetstream({
    wantedCollections: wantedCollections
  });

  // Register listeners for a specific collection.
  jetstream.onCreate("app.bsky.feed.post", (event) => {    
    const eventDetail = event.detail as JetstreamDetail;
    processEvent(eventDetail);
  });
  jetstream.onCreate("app.bsky.feed.reply", (event) => {
    const eventDetail = event.detail as JetstreamDetail;
    processEvent(eventDetail);
  });
  function processEvent(eventDetail: JetstreamDetail){
    messageCount_SetterFn(eventDetail.MessageCount);
    dataReceived_SetterFn(eventDetail.DataLength);

    const postResponse = eventDetail.PostResponse;
    const record = postResponse.Commit?.Record as BSkyApi_Record;
    let media = "";

    if (record.Embed){
      
      switch (record.Embed?.Type){
        case "app.bsky.embed.recordWithMedia":
          media = "RM";
          break;
        case "app.bsky.embed.record":
          media = "R";
          break;
        case "app.bsky.embed.images":
          media = "I";
          break;
        case "app.bsky.embed.external":
          media = "E";
          break;
        case "app.bsky.embed.video":
          media = "V";
          break;
        default:
          console.log("📺", record.Embed?.Type,record.Embed?.Video);
      }
    }

    let lower = record.Text.toLowerCase();
    

    if (lower && emojiRegex.test(lower)) {
      emojiPosts++;
      const emojis = extractEmojis(lower);

      if(emojis.length > 0){
        
          // console.log(emojis.join(" "));
          emojiMessageCount_SetterFn(emojiMessageCount_GetterFn()+1);
          addText(record.Text);
          for (let i = 0; i < emojis.length; i++) {
            const emoji = emojis[i];
            emojiPhysics.CreateEmojiBall(emoji);
          }
          
      }
    }
  }
  function extractEmojis(text: string): string[] {
    // Add the global flag 'g' to the regex for matchAll to work
    const globalEmojiRegex = new RegExp(emojiRegex.source, 'gu');
    return Array.from(text.matchAll(globalEmojiRegex), m => m[0]);
  }

  onMount(async () => {
    
    emojiPhysics = new EmojiPhysics(elMain);

    const rect = elMain.getBoundingClientRect();
    //emojiPhysics.Dimensions = {t: rect.top, w: rect.width, h: rect.height};
    screenWidth_SetterFn(rect.width);

    // Start listening to events.
    jetstream.onStart(() => {
      toastId = toast.loading('Waiting for SkeetMoji...', { position: "bottom-right", duration: 100000});
    });
    jetstream.onOpen(() => {
      socketOpen_SetterFn(true);
      toast.remove(toastId);
      toast.success("SkeetMoji feed started.");
    });
    jetstream.onClose(() => {
      socketOpen_SetterFn(false);
      toast.remove(toastId);
      toast("SkeetMoji feed closed.");
    });    
    jetstream.onError((err:string) => {
      socketOpen_SetterFn(false);
      toast.remove(toastId);
      toast.error(err);
    });

    jetstream.start();


    // Attach event listener
    window.addEventListener("keydown", handleKeyDown);
    // Resize the canvas and redraw the scene on window resize
    window.addEventListener('resize', () => {
      const rect = elMain.getBoundingClientRect();
      emojiPhysics.Dimensions = {t: rect.top, w: rect.width, h: rect.height};
      screenWidth_SetterFn(rect.width);
    });

  })

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.shiftKey && event.key === "T") {
      handleShiftT();
    }
  };

  const handleShiftT = async () => {
    // const terms: string[] = await Terms.AdultTerms();
    // downloadString("terms.txt", terms.map((t)=>{ return `#${t}`;} ).join(" "));
  };

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);

  });

  function startFeed(){
    jetstream.start();
  }
  function stopFeed(){
    jetstream.stop();
  }
  function clearFeed(){
    jetstream.clear();
    messageCount_SetterFn(0);
    emojiMessageCount_SetterFn(0);
    dataReceived_SetterFn(0);
    emojiPhysics.ClearAllEmojis();
    

    
  }

  function displayHelp(){
    elHelpDialog.showModal();

  }
  function addText(text:string) {
      // Create a new text div
      const textDiv = document.createElement("div");
      textDiv.className = styles.textDiv;
      textDiv.textContent = text;

      // Insert the new text div at the top
      if (screenWidth_GetterFn() >= 1000 && emojiMessageCount_GetterFn() % 2 === 0){
        elSkeetDivRight.insertBefore(textDiv, elSkeetDivRight.firstChild);
        // Check if any child divs have scrolled out of view
        cleanOverflow(elSkeetDivRight);
      } else {
        elSkeetDivLeft.insertBefore(textDiv, elSkeetDivLeft.firstChild);
        // Check if any child divs have scrolled out of view
        cleanOverflow(elSkeetDivLeft);
      }
      
  }

  function cleanOverflow(div: HTMLDivElement) {
      const parentHeightLeft = div.clientHeight;
      let totalHeightLeft = 0;

      Array.from(div.children).forEach((child) => {
          totalHeightLeft += (child as HTMLDivElement).offsetHeight + 5; // Include margin
          if (totalHeightLeft > parentHeightLeft) {
            div.removeChild(child);
          }
      });
  }

  
  return (
    <>
      <header class={styles.header} style="display:flex;">
        <div style="font-size:clamp(1rem, 2.5vw, 1.5rem);font-weight:bold;display:block; align-self: center;margin-left:5px;">
          <span style="vertical-align: sub;" innerHTML={SVGs.BlueSkyButterfly}></span> SkeetMoji
        </div>
        <div style="flex-grow: 1;display:block; align-self: center; margin-left:10px;font-size:clamp(0.75rem, 2vw, 1.1rem);">
        ➖ Bluesky emojis right now.
        </div>
        <div style="margin-right:15px; align-self: center;display:flex;cursor:pointer;" onclick={displayHelp}>
          <div innerHTML={SVGs.BlueSkyHelp}></div>
          <a style="font-size:clamp(0.6rem, 2vw, 1rem);">What's this?</a>
        </div>
        <div style="margin-right:5px;font-size:clamp(0.75rem, 2vw, 1.1rem);display:block; align-self: center; text-align: end;white-space: nowrap;">
          <div><span>New posts:</span> <span style="font-weight:bold;">{messageCount_GetterFn()}</span></div>
          <div><span>Data received:</span> <span style="font-weight:bold;">{(dataReceived_GetterFn()/1000000).toFixed(1)}MB</span></div>
        </div>
        
      </header>
      <main class={styles.main}>
        <div class={styles.parentDiv} style="text-align: left;"  ref={(el)=>{ elSkeetDivLeft = el;}}></div>
        <Show when={screenWidth_GetterFn() >= 1000}>
          <div class={styles.parentDivRight} style="text-align: right;" ref={(el)=>{ elSkeetDivRight = el;}}></div>
        </Show>
        <div class={styles.mainBody} ref={(el) => {elMain = el;}}>
        </div>
      </main>
      <footer class={styles.footer} style="display:flex;">
        <div style="margin:auto;">
          <Show when={!socketOpen_GetterFn()}>
            <button onclick={startFeed} style="padding:5px;font-size:20px;">Resume</button>
          </Show>
          <Show when={socketOpen_GetterFn()}>
            <button onclick={stopFeed} style="padding:5px;font-size:20px;">Pause</button>
          </Show>
          <button onclick={clearFeed} style="padding:5px;font-size:20px;">Clear</button>
        </div>
        {/* <div style="position: absolute; right:45px;bottom:5px;">
          <button onclick={listTerms}>boooo</button>
        </div> */}
        <div style="position: absolute; right:5px;bottom:5px;">
          <a href="https://github.com/voneum/s4ag.skeetmoji" target="_blank" innerHTML={SVGs.GithubLogo} title='GitHub'></a>
        </div>
      </footer>

      <dialog ref={(el) => { elHelpDialog = el}}>
        
          <div style="margin:10px">
            <h1 style="margin: auto;display: table;">SkeetMoji</h1>

            <div>Another random experiment with the BlueSky Firehose API.</div>
            <div>Also see my previous efforts at <a href="https://www.s4ag.com/amerenglish/" target="_blank">Amerenglish</a> and <a href="https://www.s4ag.com/skeetscope/" target="_blank">SkeetScope</a></div>
            <div>This one combines a live stream of posted emojis with a 2D physics simulation.</div>
            <div>Inspired by (potentially NSFW) efforts such as:</div>

            <ul style="columns: 3;-webkit-columns: 3;-moz-columns: 3;margin:10px 20px;">
              <li><a href="https://jakebailey.dev/bsky-digital-rain/" target="_blank">ATmospheric Digital Rain</a></li>            
              <li><a href="https://www.bewitched.com/demo/rainbowsky/" target="_blank">RainbowSky</a></li>
              <li><a href="https://www.emojirain.lol/" target="_blank">EmojiRain</a></li>
              <li><a href="https://www.intothebluesky.lol/" target="_blank">Into the Bluesky</a></li>
              <li><a href="https://flo-bit.dev/bluesky-visualizers/" target="_blank">Bluesky Visualizers</a></li>
              <li><a href="https://firehose3d.theo.io/" target="_blank">Firehose 3D</a></li>
              <li><a href="https://swearsky.bagpuss.org/" target="_blank">SwearSky</a> (NSFW)</li>
              <li><a href="https://javier.computer/bluesky/iam" target="_blank">I am...</a></li>
              <li><a href="https://firesky.tv/" target="_blank">Firesky</a></li>
              <li><a href="https://lantto.github.io/bluesky-mosaic/" target="_blank">Bluesky Mosaic</a> (NSFW)</li>
              <li><a href="https://bluesky.toddle.site/signups" target="_blank">Bluesky Signups</a></li>
            </ul>
            
            <div>If you want to play with the code, find it on <a href="https://github.com/voneum/s4ag.skeetmoji" target="_blank">GitHub</a>.</div>

            <div>Feel free to submit patches!</div>

          </div>

          <div style="display:grid;justify-content:center;">
            <form method="dialog">
              <button style="padding: 5px;
                  display: inline;
                  font-size: larger;
                  text-align: center;
                  background-color: #d3d3d3;
                  box-shadow: 2px 2px 2px gray;
                  cursor: pointer;
              }">OK</button>
            </form>
          </div>
        
      </dialog>

      <Toaster 
        position="bottom-right"
        gutter={8}
      />

    </>
  );
};
