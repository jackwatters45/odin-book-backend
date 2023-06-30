# Odin Book Backend

## Next

- attempt to jest populate db stuffs
  
- controllers
- jest

- set up auth

## Requirements

1. Users must sign in to see anything except the sign in page.
2. Users should be able to sign in using their real facebook details. This is fairly easily accomplished using PassportJS, and you should be able to use the knowledge you already have to figure it out from the documentation.
3. Users can send friend requests to other users.
4. A user must accept the friend request to become friends.
5. Users can create posts. (begin with text only)
6. Users can like posts.
7. Users can comment on posts.
8. Posts should always display with the post content, author, comments and likes.
9. Treat the Posts index page like the real Facebook’s “Timeline” feature – show all the recent posts from the current user and users they are friends with.
10. Users can create Profile with a photo (you can get this from the real facebook when you sign in using passport)
11. The User Show page contains their profile information, profile photo and posts.
12. The Users Index page lists all users and buttons for sending friend requests to those who are not already friends or who don’t already have a pending request.
13. Deploy your app to a host provider of your choice!

## Extra Credit

1. Make posts also allow images (either just via a url, or by uploading one.)
2. Allow Users to upload and update their own profile photo.
3. Create a guest sign-in functionality that allows visitors to bypass the login screen without creating an account or supplying credentials. This is especially useful if you are planning on putting this project on your resume - most recruiters, hiring managers, etc. will not take the time to create an account. This feature will give them an opportunity to look at your hard work without going through a tedious sign-up process.
4. Make it pretty!

## Getting Started

1. Think through the data architecture required to make this work. There are lots of models and the relationship between them is more complicated than anything you’ve done before. How are you going to model a user’s list of friends and friend requests? Posts should be able to have likes and comments associated with them, how are you going to model that? Take some time to plan your approach before diving in.
2. Start your app however you like, using the express-generator or from scratch.
3. Work your way down the list above! Each step will involve a new challenge, but you’ve got the tools.
4. You can populate data like users and posts with fake data using the Faker module from npm. To accomplish this create a new JavaScript file named seeds.js which imports your mongoose models and uses the faker module to generate and save a bunch of new users.
