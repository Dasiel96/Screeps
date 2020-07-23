// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  readonly role: string;
  readonly room: string;
  working: boolean;
  game_object_id: string;
  create: boolean;
  [key: string]: any;
}

interface Memory {
  uuid: number;
  log: any;
  [key: string]: any
}

interface SpawnMemory{
  cur_task: number
  [key: string]: any
}

interface FlagMemory{
  [key: string]: any
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}
