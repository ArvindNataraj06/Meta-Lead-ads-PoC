Meta Lead Ads: Real-Time React Native PoC

A proof of concept application that received Meta Lead Ads Submissions and displays them in a React Native App in real time without mannyal screen refresh.

Tech Stack Used

Frontend: React Native, Expo, TypeScript
Backend: Node.js, Express
Real-time connection: Socket.IO
Meta Integration: Meta Webhooks, Graph API
Local tunneling: ngrok

Working Explination:

1. A form is submitted through Meta's Lead Ads Testing Tool
2. Meta sends a webhook notification to Express Backend
3. The Express Backend Verifies the webhook signature using the Meta app scret
4. The backend uses the lead ID and page Access token to retrieve the lead information from Graph API
5. The lead is stored temporarily in memory and sends to react native app using Socket.io
6.The React Native APp received the event and update its lead list automatically 


Setup 
Backend 

cd backend
npm install

I have kept the sample .env.example for format , configure the required Meta credentials

Start the Backend: Node server.js

Then Start ngrok in another terminal: ngrok http 3000

Configure the public ngrok callback URL in Meta Developer Dashboard: https://YOUR-NGROK-DOMAIN/webhook
then Verify the webhook and subscribe the facebook page to Leadgen events

Frontend

cd Mobile 
npm install 

I have lept the sample .env.example for format , set EXPO_PUBLIC_SERVER_URL to your current backend's ngrok URL

To start the application : npx expo start 
scan the OR code in Expo app 

Final 

open the screen in React Native App 
confirm the app is connected to backend 
Open Meta's Lead Ads testing tool, then select the configured page and instant form 
submit the form by clicking on [Create Lead] Button
Verify that lead appears in the app automatically.

Project Status 

The End to End real-time lead delivery workflow has been implemented and tested successfully