import { Upgrader } from "./upgrader"
import { Harvester } from "./harvester"
import { PerminentStructRepair } from "./perminentRepair"
import { Builder } from "./builder"
import { DecayRepair } from "./decayRepair"
import { CreepTask } from "./creepTasks"
import { Defender } from "./defender"
import { TowerSupplier } from "./towerSupplier"
import { Tower } from "./tower"
import { CommonFunctions } from "./commonFuncs"
import { UnsignedNumber } from "./unsignedNum"
import { flags, task_names } from "./enums"
import { Claimer } from "./claimer"
import { Links } from "./links"

const tasks = new Map<string, CreepTask>();
const task_counters = new Map<string, UnsignedNumber>()

tasks.set(task_names[task_names.harvester], new Harvester())
tasks.set(task_names[task_names.upgrader], new Upgrader())
tasks.set(task_names[task_names.permStructRepair], new PerminentStructRepair())
tasks.set(task_names[task_names.builder], new Builder())
tasks.set(task_names[task_names.defender], new Defender())
tasks.set(task_names[task_names.supplier], new TowerSupplier())
tasks.set(task_names[task_names.decayStructRepair], new DecayRepair())
tasks.set(task_names[task_names.claimer], new Claimer())


let cur_task: UnsignedNumber
let should_init = true
let important_tasks_keys = [
  task_names[task_names.harvester],
  task_names[task_names.supplier],
  task_names[task_names.defender],
  task_names[task_names.claimer],
]

let harvesterLink = new Links(task_names[task_names.harvester], 100)
const tower = new Tower()

function findStructAtPosition(x: number, y: number, room: Room, type: StructureConstant) {
  const structs_at_spawn_pos = room.lookAt(x, y)
  let is_struct_at_pos = false

  for (const struct of structs_at_spawn_pos) {
    if (struct.structure?.structureType === type) {
      is_struct_at_pos = true
      break
    }
  }

  return is_struct_at_pos
}

function createHarvesterAndOtherCreep(creep: CreepTask, master: StructureSpawn) {
  const all_task = new Array<CreepTask>()
  const important_tasks_keys_copy = new Array<string>()
  const saved_keys = new Array<string>()

  for(const keys of important_tasks_keys){
    if(!Defender.underAttack && (keys === task_names[task_names.supplier] || keys === task_names[task_names.defender])){
      saved_keys.push(keys)
    }
    else{
      important_tasks_keys_copy.push(keys)
    }
  }

  for(const keys of saved_keys){
    important_tasks_keys_copy.push(keys)
  }

  for (const key of important_tasks_keys_copy) {
    if (tasks.has(key)) {
      all_task.push(tasks.get(key)!!)
    }
  }
  all_task.push(creep)

  let both_created = false

  for (const pending_task of all_task) {
    both_created = pending_task.create(master)

    if (!both_created) {
      break
    }
  }

  return both_created
}

function createFlags(spawn: StructureSpawn) {
  let flag_das_present = false
  let flag_supplier_wait = false
  let flag_harvester_wait = false

  for (const flag_found of spawn.room.find(FIND_FLAGS)) {
    if (flag_found.name === CommonFunctions.getFlagName(flags.DAS, spawn.room)) {
      flag_das_present = true
    }
    else if (flag_found.name === CommonFunctions.getFlagName(flags.supplier_wait, spawn.room)) {
      flag_supplier_wait = true
    }
    else if (flag_found.name === CommonFunctions.getFlagName(flags.harvester_wait, spawn.room)) {
      flag_harvester_wait = true
    }
  }

  const mid_room_x = 24
  const mid_room_y = 24
  let flag_name: string

  if (!flag_harvester_wait) {
    flag_name = CommonFunctions.getFlagName(flags.harvester_wait, spawn.room)
    spawn.room.createFlag(mid_room_x, mid_room_y, flag_name)
  }

  if (!flag_supplier_wait) {
    flag_name = CommonFunctions.getFlagName(flags.supplier_wait, spawn.room)
    spawn.room.createFlag(mid_room_x, mid_room_y, flag_name)
  }

  if (!flag_das_present) {
    flag_name = CommonFunctions.getFlagName(flags.DAS, spawn.room)
    spawn.room.createFlag(mid_room_x, mid_room_y, flag_name)
  }
}

function incCurTask(master: StructureSpawn) {
  if(task_counters.has(master.room.name)){
    task_counters.get(master.room.name)!!.add(1)
    master.memory.cur_task = task_counters.get(master.room.name)!!.get()
  }
}

function checkToActivateSafeMode(spawn: StructureSpawn) {
  const num_of_towers = spawn.room.find(FIND_MY_STRUCTURES, {
    filter: (struct) => {
      return struct.structureType === STRUCTURE_TOWER
    }
  }).length

  if (Defender.underAttack && !findStructAtPosition(spawn.pos.x, spawn.pos.y, spawn.room, STRUCTURE_RAMPART) && num_of_towers > 0) {
    spawn.room.controller?.activateSafeMode()
  }
  else if(spawn.hits <= spawn.hitsMax/5){
    spawn.room.controller?.activateSafeMode()
  }
}

function onSetUp(spawn: StructureSpawn) {
  if (should_init) {
    CommonFunctions.setNumOfTasks(tasks.size)
    cur_task = new UnsignedNumber(spawn.memory.cur_task)
    should_init = false
  }
}

function onDestroy() {
  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  for(const name in Memory.flags){
    if(!(name in Game.flags)){
      delete Memory.flags[name]
    }
  }
}

function onCreate(master: StructureSpawn) {
  const keys = Array<string>()

  if(!task_counters.has(master.room.name)){
    if(!master.memory.cur_task){
      master.memory.cur_task = 0
    }
    task_counters.set(master.room.name, new UnsignedNumber(master.memory.cur_task))
  }


  if (!master.memory.cur_task) {
    master.memory.cur_task = 0
  }

  for (const task_key of tasks.keys()) {
    if (!important_tasks_keys.includes(task_key)) {
      keys.push(task_key)
    }
  }
  const key_index = task_counters.get(master.room.name)!!.get() % keys.length
  const pending_task = tasks.get(keys[key_index])

  if (createHarvesterAndOtherCreep(pending_task!!, master)) {
    incCurTask(master)
  }
}

function onLoop(creep: Creep) {
  tasks.get(creep.memory.role)?.run(creep)
}


export const loop = function () {
  onDestroy()
  for (let spawn_name in Game.spawns) {
    const spawn = Game.spawns[spawn_name]

    if (!CommonFunctions.hasRoom(spawn.room)) {
      createFlags(spawn)
      CommonFunctions.addRoom(spawn.room)
    }

    CommonFunctions.setRoom(spawn.room)

    onSetUp(spawn)
    onCreate(spawn)

    checkToActivateSafeMode(spawn)


    tower.run(spawn.room)
    harvesterLink.run(spawn.room)
  }

  for (let creep_name in Game.creeps) {
    const creep = Game.creeps[creep_name]
    CommonFunctions.setRoom(creep.room)
    onLoop(creep)
  }


  tower.reset()
  harvesterLink.reset()
};
