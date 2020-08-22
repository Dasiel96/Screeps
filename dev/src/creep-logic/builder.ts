import { CommonFunctions } from "../commonFuncs"
import { CreepTask } from "./creepTasks"
import { task_names } from "../enums"
import { CreepActions } from "./creepAction"
import { CreepData } from "../interfaces"



export class Builder extends CreepTask {

    // used to determine if a construction site is currently being worked on
    private static sites_under_construction = new Map<string, string>()

    protected role: string = task_names[task_names.builder]

    /**
    * This task builds all structures for the colony
    */
    constructor() {
        super()
    }

    /**
     * stores a construction site id within a creep's memory and in sites_under_construction if there are any 
     * valid construction sites within a room, otherwise it will store an empty string in the creep's memory.
     * @param creep the creep that will have the construction site id stored in memory
     * @returns void
     * @author Daniel Schechtman
     */
    private giveBuilderASite(creep: Creep): void {

        const new_spawn = CommonFunctions.getNewRoomSpawn()
        const site_ids = this.manager.getMyConstructionSites()
        let site: string | null = null

        if (site_ids.length > 0){
            site = site_ids[0].id
        }

        if (new_spawn !== null && !Builder.sites_under_construction.has(new_spawn.id)) {
            creep.memory.game_object_id = new_spawn.id
            Builder.sites_under_construction.set(new_spawn.id, creep.name)
        }
        else if (site !== null) {
            creep.memory.game_object_id = site
            Builder.sites_under_construction.set(site, creep.name)
        }
        else if (site === null) {
            creep.memory.game_object_id = ""
        }
    }

    protected startLogic(creep: Creep) {
        
    }

    protected runLogic(creep: Creep): void {

        CommonFunctions.changeWorkingState(creep)

        if (creep.memory.game_object_id.length === 0) {
            this.giveBuilderASite(creep)
        }
        else if (!Builder.sites_under_construction.has(creep.memory.game_object_id)) {
            // this is for when the script is reset, the script can remember what construction sits
            // are being worked on
            Builder.sites_under_construction.set(creep.memory.game_object_id, creep.name)
        }

        if (!creep.memory.working) {
            CreepActions.harvest(creep)
        }
        else {
            const construction_site = Game.getObjectById<ConstructionSite>(creep.memory.game_object_id)
            let build_status: ScreepsReturnCode | null = null

            if (construction_site) {
                build_status = creep.build(construction_site)
            }

            switch (build_status) {
                case ERR_NOT_IN_RANGE: {
                    creep.moveTo(construction_site!!, CommonFunctions.pathOptions())
                    break
                }
                case OK: {
                    break
                }
                default: {
                    this.giveBuilderASite(creep)
                    if (creep.memory.game_object_id.length === 0) {
                        creep.suicide()
                    }
                    break
                }
            }
        }
    }

    protected spawnCheck(): boolean {

        let construction_sites = this.manager.getMyConstructionSites()
        const num_of_builders = this.manager.getMyCreeps(this.role).length
        this.num_of_creeps = num_of_builders

        let cap = this.cap

        const new_spawn_site = CommonFunctions.getNewRoomSpawn()
        if (new_spawn_site !== null && !Builder.sites_under_construction.has(new_spawn_site.id)) {
            construction_sites = [new_spawn_site, ...construction_sites]
            cap = this.cap + 1
        }

        let should_spawn = construction_sites.length > 0 && num_of_builders < cap

        const part_types = [WORK, CARRY, TOUGH, HEAL, ATTACK, RANGED_ATTACK, CLAIM]

        this.skeleton.work = 4
        this.skeleton.carry = 4

        if (this.skeleton.move === 0) {
            for (const part of part_types) {
                this.skeleton.move += this.skeleton[part]
            }
        }

        return should_spawn
    }

    protected destroyLogic(creep: CreepData) {
        console.log(`${creep.name} has died`)
        let remove_creep_id = ""

        for (const id of Builder.sites_under_construction.keys()){
            const name = Builder.sites_under_construction.get(id)!!
            if (name === creep.name){
                remove_creep_id = id;
                break
            }
        }

        if (remove_creep_id.length > 0) {
            Builder.sites_under_construction.delete(remove_creep_id)
        }
    }

    getRole(): string {
        return this.role
    }
}
