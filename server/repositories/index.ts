import { InMemoryClickRepo, InMemorySearchRepo, InMemoryUserRepo } from "./inMemory";

export const userRepo = new InMemoryUserRepo();
export const searchRepo = new InMemorySearchRepo();
export const clickRepo = new InMemoryClickRepo();

