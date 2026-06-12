{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Payments.Config
  ( Config (..),
    CashfreeEnv (..),
    loadConfig,
    cashfreeBaseUrl,
  )
where

import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)
import System.Environment (lookupEnv)

data CashfreeEnv = Sandbox | Production deriving (Eq, Show, Generic)

data Config = Config
  { port :: Int,
    dbPath :: FilePath,
    cashfreeEnv :: CashfreeEnv,
    cashfreeClientId :: Text,
    cashfreeClientSecret :: Text,
    cashfreeApiVersion :: Text
  }
  deriving (Eq, Show, Generic)

loadConfig :: IO Config
loadConfig = do
  portV <- readEnvInt "PAYMENTS_PORT" 4010
  dbPathV <- fromMaybe "payments.sqlite3" <$> lookupEnv "PAYMENTS_DB_PATH"
  envV <- readEnvText "CASHFREE_ENV" "sandbox"
  clientIdV <- requireEnvText "CASHFREE_CLIENT_ID"
  clientSecretV <- requireEnvText "CASHFREE_CLIENT_SECRET"
  apiVersionV <- readEnvText "CASHFREE_API_VERSION" "2025-01-01"
  pure
    Config
      { port = portV,
        dbPath = dbPathV,
        cashfreeEnv = if T.toLower envV == "production" then Production else Sandbox,
        cashfreeClientId = clientIdV,
        cashfreeClientSecret = clientSecretV,
        cashfreeApiVersion = apiVersionV
      }

cashfreeBaseUrl :: CashfreeEnv -> Text
cashfreeBaseUrl Sandbox = "https://sandbox.cashfree.com/pg"
cashfreeBaseUrl Production = "https://api.cashfree.com/pg"

readEnvInt :: String -> Int -> IO Int
readEnvInt k def = do
  v <- lookupEnv k
  case v of
    Nothing -> pure def
    Just s -> case reads s of
      [(n, "")] -> pure n
      _ -> pure def

readEnvText :: String -> Text -> IO Text
readEnvText k def = do
  v <- lookupEnv k
  pure $ maybe def T.pack v

requireEnvText :: String -> IO Text
requireEnvText k = do
  v <- lookupEnv k
  case v of
    Nothing -> fail ("Missing required env: " <> k)
    Just s -> pure (T.pack s)