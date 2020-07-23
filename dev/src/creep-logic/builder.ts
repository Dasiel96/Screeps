import { CommonFunctions } from "../commonFuncs"
import { CreepTask } from "./creepTasks"
import { task_names } from "../enums"
import { CreepActions } from "./creepAction"
import { FIFOStack } from "../stack"



export class Builder extends CreepTask {

    // used to determine if a construction site is currently being worked on
    private static sites_under_construction = new Map<string, string>()

    // used to assign construction sites to specific creep
    private construction_site_stack = new FIFOStack<ConstructionSite>()

    protected role: string = task_names[task_names.builder]

    /**
    * This task builds all structures for the colony
    */
    constructor() {
        super()
    }

    /**
     * removes construction sites from sites_under_construction so that if one builder
     * didn't complete a job, another builder can
     * @returns void
     * @author Daniel Schechtman
     */
    private removeSitesFromMemory(): void {
        const sites_under_construction_copy = new Map<string, string>()

        // makes a copy to ensure data isn't being removed from the original while
        // it's still being checked for items to delete
        Builder.sites_under_construction.forEach((val: string, key: string) => {
            sites_under_construction_copy.set(key, val)
        })

        sites_under_construction_copy.forEach((creep_name: string, construction_site_id: string) => {
            if (!Game.creeps[creep_name]) {
                Builder.sites_under_construction.delete(construction_site_id)
            }
        })
    }

    /**
     * stores a construction site id within a creep's memory and in sites_under_construction if there are any 
     * valid construction sites within a room, otherwise it will store an empty string in the creep's memory.
     * @param creep the creep that will have the construction site id stored in memory
     * @param pop_stack a flag to determine if the current construction site being looked at 
     * on the stack should be popped (false by defualt) 
     * @returns void
     * @author Daniel Schechtman
     */
    private giveBuilderASite(creep: Creep, pop_stack: boolean = false): void {

        if (this.construction_site_stack.size() === 0) {
            let construction_sites = this.manager.getMyConstructionSites()
            for (const site of construction_sites) {
                this.construction_site_stack.push(site)
            }
        }

        const new_spawn = CommonFunctions.getNewRoomSpawn()

        if (pop_stack) {
            this.construction_site_stack.pop()
        }

        let site = this.construction_site_stack.peek()


        if (new_spawn !== null && !Builder.sites_under_construction.has(new_spawn.id)) {
            creep.memory.game_object_id = new_spawn.id
            Builder.sites_under_construction.set(new_spawn.id, creep.name)
        }
        else if (site !== null) {
            creep.memory.game_object_id = site.id
            Builder.sites_under_construction.set(site.id, creep.name)
        }
        else if (site === null) {
            creep.memory.game_object_id = ""
        }
    }


    protected runLogic(creep: Creep): void {

        CommonFunctions.changeWorkingState(creep)

        if (creep.memory.game_object_id.length === 0) {
            this.giveBuilderASite(creep)
        }
        else if (!Builder.sites_under_construction.has(creep.memory.game_object_id)) {
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
                case ERR_INVALID_TARGET: {
                    this.giveBuilderASite(creep, true)
                    if (creep.memory.game_object_id.length === 0) {
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

    protected createLogic(): boolean {
        this.removeSitesFromMemory()

        let num_of_construct_sites = this.manager.getMyConstructionSites()
        const num_of_builders = this.manager.getMyCreeps(this.role).length
        this.num_of_creeps = num_of_builders

        let cap = this.cap

        const new_spawn_site = CommonFunctions.getNewRoomSpawn()
        if (new_spawn_site !== null && !Builder.sites_under_construction.has(new_spawn_site.id)) {
            num_of_construct_sites = [new_spawn_site, ...num_of_construct_sites]
            cap = this.cap + 1
        }

        let should_spawn = num_of_construct_sites.length > 0 && num_of_builders < cap

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

    getRole(): string {
        return this.role
    }
}
