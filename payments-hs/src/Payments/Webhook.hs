{-# LANGUAGE OverloadedStrings #-}

module Payments.Webhook
  ( verifyCashfreeSignature,
  )
where

import Crypto.Hash.Algorithms (SHA256)
import Crypto.MAC.HMAC (HMAC, hmac, hmacGetDigest)
import Data.ByteArray (convert)
import qualified Data.ByteString as BS
import qualified Data.ByteString.Base64 as B64
import qualified Data.CaseInsensitive as CI
import qualified Data.Text as T
import qualified Data.Text.Encoding as TE
import Network.HTTP.Types (RequestHeaders)

verifyCashfreeSignature :: BS.ByteString -> RequestHeaders -> T.Text -> Bool
verifyCashfreeSignature rawBody headers secret =
  case (lookupHeader "x-webhook-timestamp", lookupHeader "x-webhook-signature") of
    (Just ts, Just sig) ->
      let signStr = BS.concat [ts, rawBody]
          key = TE.encodeUtf8 secret
          digest :: HMAC SHA256
          digest = hmac key signStr
          computed = B64.encode (convert (hmacGetDigest digest) :: BS.ByteString)
       in computed == sig
    _ -> False
  where
    lookupHeader :: CI.CI BS.ByteString -> Maybe BS.ByteString
    lookupHeader k = lookup k headers