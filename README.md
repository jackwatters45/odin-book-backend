# Odin Book Backend

## Next

- hash all tokens

- password changed notification
- consistent name avatar vs profile pic
- sharp resize -> actual sizes for each type (avatar, cover, post)
- creating posts - figure out post details when actually implementing
- generate token tests
- notifications test + routes etc
- move model types to own file
- somehow sync types with frontend
- same with /models/data
- unnecessary ?s
- use fingerprint for tokens (currently just one token per user)
- next project use centralized error handling for all errors
  - removed all typical 500 try catch blocks so may need to go back to somehow add specific error text
  - if (!user) {
    throw new NotFoundError("User not found");
    }
