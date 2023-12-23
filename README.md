# Odin Book Backend

## Introduction

This is the backend for "Odinbook", a facebook clone that implements its basic profile and social features. This is my final project as a part of the Odin Project Full-stack Javascript curriculum.

## Takeaways

This project turned out to be quite a challenge, mainly the scope was quite larger than I had worked with in the past and there were quite a few new technologies that I took on for the first time. As long as it took, I do feel like I became a much better developer as a result of my tribulations.

## Technologies Used

- ReactJs
- Tanstack query
- Typescript
- NodeJs
- Socket.io
- PassportJs
- MongoDb (Mongoose)
- RedisDb
- Vitest (fronted)
- SuperTest (Jest)

## Features

### Auth

#### Login/Signup

- Local
- PassportJs Facebook
- PassportJs Google
- PassportJs Github

#### Forgot Password

- Twilio (sms)
- Nodemailer (email)

#### Account verification

- Twilio (sms)
- Nodemailer (email)

### Live Notification Count Updates

#### Socket.io

- Live updated to notification count using Socket.io

#### RedisDb

- Manages socket registration

### User profiles

#### Edit Profile Basics

- cover photo
- avatar photo
- hobbies
- bio
- intro

#### View User Posts

- Posts infinite scroll
- Preview photos, intro, friends

#### User About

- Update personal details (family, education, relationships, etc)
- change audience of details to only show (friends, public, only me)

### Notifications

#### Page View

- Filter between read and unread
- Notifications for:
  - New Friend
  - Friend Request
  - Comment
  - Reaction
  - Friend Birthdays

#### Live time updates

- Uses Socket.io to provide realtime notification count updates
- uses redis to store user socket id

### Posts

#### Dashboard

- View friends posts
- Infinite scroll
- Caching

#### Social

- React (like, surprise, dislike etc)
- Comment
  - react
  - reply
  - edit
  - Share (basically a repost)

#### Post Options

- Edit Audience
- Edit all details of post
- Delete
- Save
- Expanded dialog

### Friends

#### Friend Requests

- Send
- Receive
- Cancel
- Accept
- Decline

#### Friends Page

- Page Views
  - requests
  - all friends
  - suggested friends
- User Previews withing friends page
  - view users entire profile without having to leave the friends page
