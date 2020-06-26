import { CreepTask } from "./creepTasks"
import { CommonFunctions } from "./commonFuncs"
import { Defender } from "./defender"
import { flags, task_names } from "./enums"

export class TowerSupplier extends CreepTask{
    protected role = task_names[task_names.supplier]

    private creep_tower_tracker = new Map<string, string>()

    private creeps_near_link = new Map<string, boolean>()

    private removeTowerFromTracking(){
        const creep_tower_tracker_copy = new Map<string, string>()

        this.creep_tower_tracker.forEach((value: string, key: string) => {
            creep_tower_tracker_copy.set(key, value)
        })

        creep_tower_tracker_copy.forEach((creep_name: string, tower_id: string) =>{
            if(!Game.creeps[creep_name]){
                this.creep_tower_tracker.delete(tower_id)
            }
        })
    }

    protected log(){

    }

    private assignTower(creep: Creep){
        const filter_opt: FilterOptions<FIND_STRUCTURES> = {
            filter: (struct) => {return struct.structureType === STRUCTURE_TOWER}
        }
        const towers = creep.room.find(FIND_STRUCTURES, filter_opt)

        for(const tower of towers){
            if(!this.creep_tower_tracker.has(tower.id)){
                creep.memory.game_object_id = tower.id
                this.creep_tower_tracker.set(tower.id, creep.name)
                break
            }
        }
    }

    getRole(): string {
        return this.role
    }

    protected runLogic(creep: Creep) {
        this.removeTowerFromTracking()
        const state = CommonFunctions.changeWorkingState(creep)
        const source_ref = "source"


        if(state !== 1 && !creep.memory[source_ref]){
            creep.memory[source_ref] = creep.pos.findClosestByPath(FIND_SOURCES)?.id
        }
        else if(state == 1){
            creep.memory[source_ref] = null
        }

        if(!creep.memory.game_object_id){
            this.assignTower(creep)
        }
        else if(!this.creep_tower_tracker.has(creep.memory.game_object_id)){
            this.creep_tower_tracker.set(creep.memory.game_object_id, creep.name)
        }
        
        const should_ignore_creep = !Defender.underAttack
        const path_opts = CommonFunctions.pathOptions(should_ignore_creep)

        if(!creep.memory.working){
            this.creeps_near_link.set(creep.id, false)
            const tower = Game.getObjectById<StructureTower>(creep.memory.game_object_id)!!
            const structs_in_range = tower.pos.findInRange(FIND_MY_STRUCTURES, 3)
            let source: Source | StructureLink | StructureStorage = Game.getObjectById(creep.memory[source_ref]) as Source

            for(const structs of structs_in_range){
                if(structs.structureType === STRUCTURE_LINK){
                    source = structs
                    this.creeps_near_link.set(creep.id, true)
                    break
                }
            }

            let status 
            if(!this.creeps_near_link.get(creep.id)){
                const store = creep.room.find(FIND_MY_STRUCTURES, {
                    filter: (s) => {
                        return s.structureType === STRUCTURE_STORAGE && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                    }
                })

                if(store.length > 0){
                    source = store[0] as StructureStorage
                    status = creep.withdraw(source as StructureStorage, RESOURCE_ENERGY)
                }
                else{
                    status = creep.harvest(source as Source)      
                }
            }
            else{
                status = creep.withdraw(source as StructureLink, RESOURCE_ENERGY)
            }

            
            if(status === ERR_NOT_IN_RANGE){
                creep.moveTo(source, CommonFunctions.pathOptions())
            }
            else if(this.creeps_near_link.get(creep.id) && status === OK) {
                creep.memory.working = true
            }
        }
        else{
            const tower = Game.getObjectById(creep.memory.game_object_id) as StructureTower
            
            if(tower !== null && tower.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                const transfer_status = creep.transfer(tower, RESOURCE_ENERGY)
                if(transfer_status === ERR_NOT_IN_RANGE){
                    creep.moveTo(tower, path_opts)
                }
            }
            else if(!this.creeps_near_link.get(creep.id)){
                const flag = CommonFunctions.getFlagName(flags.supplier_wait, creep.room)
                creep.moveTo(Game.flags[flag])
            }
        }

        if(creep.ticksToLive!! === 1){
            this.creeps_near_link.delete(creep.id)
        }
    }

    protected createLogic(master: StructureSpawn): boolean {
        const num_of_tower_suppliers = CommonFunctions.getMyCreeps(this.role, master).length
        const num_of_towers = master.room.find(FIND_MY_STRUCTURES, {
            filter: (structs) => {return structs.structureType === STRUCTURE_TOWER}
        }).length

        const should_spawn = num_of_tower_suppliers < num_of_towers

        if(should_spawn){
            this.skeleton.work = 4
            this.skeleton.carry = 4
            this.skeleton.move = 2

            const body = CommonFunctions.createBody(this.skeleton)
            const name = CommonFunctions.createName(this.role)
            const role = CommonFunctions.createMemData(this.role, master.room.name)

            master.spawnCreep(body, name, role)
        }


        return !should_spawn
    }

}
