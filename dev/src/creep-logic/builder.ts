import { CommonFunctions } from "../commonFuncs"
import { CreepTask } from "./creepTasks"
import { task_names } from "../enums"


// this task tells creeps to go around the colony and build structures
export class Builder extends CreepTask {

    protected role: string = task_names[task_names.builder]

    // associates construction site with the builder so that the builder knows
    // which site to work on
    private static sites_under_construction = new Map<string, string>()

    private reassignToNewSpawn() {
        let newest_creep: Creep | null = null
        let tick_to_live = 0

        for (const creep_name in Game.creeps) {
            const cur_creep = Game.creeps[creep_name]
            if (cur_creep.memory.role === this.role && tick_to_live < cur_creep.ticksToLive!!) {
                tick_to_live = cur_creep.ticksToLive!!
                newest_creep = cur_creep
            }
        }

        if (newest_creep) {
            newest_creep.memory.game_object_id = CommonFunctions.getNewRoomSpawn()!!.id
        }
    }

    // ensures that if a structure isn't complete upon a creep's death
    // the task is alerted to assign another creep to build said structure
    private removeSitesFromMemory() {
        const sites_under_construction_copy = new Map<string, string>()

        Builder.sites_under_construction.forEach((val: string, key: string) => {
            sites_under_construction_copy.set(key, val)
        })

        sites_under_construction_copy.forEach((creep_name: string, construction_site_id: string) => {
            if (!Game.creeps[creep_name]) {
                Builder.sites_under_construction.delete(construction_site_id)
            }
        })
    }

    // associates specific creep with a construction site to be worked
    // on while the construction isn't complete
    private assignConstructSiteToCreep(creep: Creep) {
        let construction_sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)

        for (let site of construction_sites) {
            if (!Builder.sites_under_construction.has(site.id)) {
                creep.memory.game_object_id = site.id
                Builder.sites_under_construction.set(site.id, creep.name)
                break
            }
        }
    }

    // DEPRICATED METHOD THAT WILL BE REMOVED
    protected log() {

    }

    getRole(): string {
        return this.role
    }

    // logic to be performed when a task is run
    protected runLogic(creep: Creep) {
        const spawn_site_in_new_room = CommonFunctions.getNewRoomSpawn()

        // will assign a new spaw to be built in another room if a new one exists
        if (spawn_site_in_new_room) {
            const new_spawn_id = spawn_site_in_new_room.id
            if (!Builder.sites_under_construction.has(new_spawn_id)) {
                creep.memory.game_object_id = new_spawn_id
                Builder.sites_under_construction.set(new_spawn_id, creep.name)
            }
        }

        const state = CommonFunctions.changeWorkingState(creep)
        const source_ref = "source"

        if (!creep.memory.game_object_id) {
            this.assignConstructSiteToCreep(creep)
        }
        else if (!Builder.sites_under_construction.has(creep.memory.game_object_id)) {
            Builder.sites_under_construction.set(creep.memory.game_object_id, creep.name)
        }

        if (!creep.memory.working) {
            if(!creep.memory[source_ref]){
                creep.memory[source_ref] = CommonFunctions.findClosestSource(creep)
            }
            
            const sources = creep.pos.findClosestByPath(FIND_SOURCES)!!
            const build_status = creep.harvest(sources)
            if (build_status === ERR_NOT_IN_RANGE) {
                creep.moveTo(sources, CommonFunctions.pathOptions())
            }
        }
        else {
            const construction_site = Game.getObjectById(creep.memory.game_object_id) as ConstructionSite
            let build_status = creep.build(construction_site)

            switch (build_status) {
                case ERR_NOT_IN_RANGE: {
                    creep.moveTo(construction_site, CommonFunctions.pathOptions())
                    break
                }
                case OK:{
                    break
                }
                case ERR_INVALID_TARGET: {
                    creep.memory.game_object_id = ""
                    this.assignConstructSiteToCreep(creep)
                    
                    if(creep.memory.game_object_id.length === 0){
                        creep.suicide()
                    }
                    break
                }
                default: {
                    creep.suicide()
                }
            }
        }
    }

    protected createLogic(master: StructureSpawn): boolean {
        this.removeSitesFromMemory()
        let num_of_construct_sites = master.room.find(FIND_MY_CONSTRUCTION_SITES)
        const num_of_builders = CommonFunctions.getMyCreeps(this.role, master).length
        let cap = this.cap

        if (CommonFunctions.getNewRoomSpawn()) {
            const new_spawn_site = CommonFunctions.getNewRoomSpawn()!!
            console.log("has room")
            if (!Builder.sites_under_construction.has(new_spawn_site.id)) {
                num_of_construct_sites = [CommonFunctions.getNewRoomSpawn()!!, ...num_of_construct_sites]
                console.log("site added")
                cap = this.cap + 1
            }
        }

        let spawn = num_of_construct_sites.length > 0 && num_of_builders < cap

        if (spawn) {
            this.skeleton.work = 4
            this.skeleton.carry = 4
            this.skeleton.move = 5


            let body = CommonFunctions.createBody(this.skeleton)
            const name = CommonFunctions.createName(this.role)
            const role = CommonFunctions.createMemData(this.role, master.room.name)

            master.spawnCreep(body, name, role)
        }


        return !spawn
    }
}
