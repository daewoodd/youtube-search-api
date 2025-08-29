require('dotenv').config();  // To access .env file, which has the channel ID + the API key for YT
const fs = require('fs');   // to write the results to results.json


const API_KEY = process.env.YOUTUBE_API;
const CHANNEL_ID = process.env.CHANNEL_ID;
const MIN_VIEWS = 300000;

async function fetchChannelVideos(pageToken = "") {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({
    key: API_KEY,
    channelId: CHANNEL_ID,
    part: "snippet",
    order: "date",
    type: "video",
    pageToken,
  }); // so "pageToken" is here cuz it's searching page-by-page, you need this to go to the "next" page to continue searching

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  console.log(`Search Data: ${JSON.stringify(searchData, null, 4)}`)

  const videoIds = searchData.items.map(item => item.id.videoId).join(",");
  console.log(`Retrieved video IDs: ${videoIds}`)
  if (!videoIds) return [];

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.search = new URLSearchParams({
    key: API_KEY,
    id: videoIds,
    part: "snippet,statistics"
  });

  const videosRes = await fetch(videosUrl);
  const videosData = await videosRes.json();

  const popularVideos = videosData.items
    .filter(v => parseInt(v.statistics.viewCount) > MIN_VIEWS)
    .map(v => ({
      title: v.snippet.title,
      views: v.statistics.viewCount,
      upload_date: v.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${v.id}`
    }));

  if (searchData.nextPageToken) { // recursive function, just keep moving on to the next page till all options exhausted
    const nextVideos = await fetchChannelVideos(searchData.nextPageToken);
    return popularVideos.concat(nextVideos);
  }

  return popularVideos;
}

(async () => {
  try {
    const videos = await fetchChannelVideos(); // fetch the videos
    console.log(`\n\n Total video count: ${videos.length}`)
    console.log("\n\nVideos with > 300k views:\n");
    videos.forEach(v => { // show in terminal
      console.log(`${v.title} (${v.views} views)\n${v.url}\n`);
    });

    const resultData = JSON.stringify(videos, null, 2);

    // write to results.json tile
    fs.writeFile('results.json', resultData, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('JSON data has been written to output.json');
    });


  } catch (err) {

    if(err instanceof TypeError) {
      console.log("API key exhausted, try again later I guess?")
    }
    else {
      console.error("Error:", err);
    }
    
  }
})();