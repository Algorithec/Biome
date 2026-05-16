module Main (main) where

import Payments.Config
import Payments.DB
import Payments.Server

main :: IO ()
main = do
  cfg <- loadConfig
  withDb (dbPath cfg) $ \db -> do
    migrate db
    runServer cfg db

