import { CommonFunctions } from "./commonFuncs"
import { Defender } from "./defender"
import { task_names, flags } from "./enums"
import { StructTasks } from "./structureTasks"
import { UnsignedNumber } from "./unsignedNum"
import { RepairTarget } from "./repairTarget"

export class Tower extends StructTasks {

    private readonly defender_role = task_names[task_names.defender]
    private readonly tower_cool_down = new Map<string, UnsignedNumber>()
    private readonly num_of_links_near_tower = new Map<string, number>()

    private targets = new Map<string, RepairTarget>()

    private removeDuplicateCreeps(creeps: Creep[]) {
        const creep_tracker = new Map<string, null>()
        const unique_creeps = new Array<Creep>()

        for (const creep of creeps) {
            if (!creep_tracker.has(creep.name)) {
                unique_creeps.push(creep)
                creep_tracker.set(creep.name, null)
            }
        }

        return unique_creeps
    }

    private getHostileCreeps() {
        let hostile_creeps = new Array<Creep>()

        const hostile_healers = CommonFunctions.getHostileCreeps(HEAL)
        const hostile_range = CommonFunctions.getHostileCreeps(RANGED_ATTACK)
        const hostile_attack = CommonFunctions.getHostileCreeps(ATTACK)
        const hostile_other = CommonFunctions.getHostileCreeps()

        if (hostile_healers) {
            hostile_creeps = hostile_creeps.concat(hostile_healers)
        }

        if (hostile_range) {
            hostile_creeps = hostile_creeps.concat(hostile_range)
        }

        if (hostile_attack) {
            hostile_creeps = hostile_creeps.concat(hostile_attack)
        }

        if (hostile_other) {
            hostile_creeps = hostile_creeps.concat(hostile_other)
        }

        return this.removeDuplicateCreeps(hostile_creeps)
    }

    private compFunc(a: AnyStructure, b: AnyStructure) {
        let ret_val = 0

        if (a.hits < b.hits) {
            ret_val = -1
        }
        else if (a.hits > b.hits) {
            ret_val = 1
        }
        return ret_val
    }

    protected runLogic(room: Room): void {

        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: (structs) => {
                return structs.structureType === STRUCTURE_TOWER
            }
        })

        const colony_is_expanding = Boolean(Game.flags[flags[flags.becon]])


        let repair_fire_rate = 10
        let defense_fire_rate = 5

        let nth_tower_target = 0

        for (let i = 0; i < towers.length; i++) {
            if (!this.tower_cool_down.has(towers[i].id)) {
                this.tower_cool_down.set(towers[i].id, new UnsignedNumber(0))
            }
            const tower = towers[i] as StructureTower
            const cool_down_counter = this.tower_cool_down.get(tower.id)!!

            if (!this.num_of_links_near_tower.has(tower.id)) {
                const num_of_links = tower.pos.findInRange(FIND_STRUCTURES, 3, {
                    filter: (struct) => {
                        return struct.structureType === STRUCTURE_LINK
                    }
                }).length

                this.num_of_links_near_tower.set(tower.id, num_of_links)
            }

            if (cool_down_counter.get()%defense_fire_rate === 0 && Defender.underAttack) {
                const hostile_creeps = this.getHostileCreeps()
                const defenders = CommonFunctions.getMyCreeps(this.defender_role, room)
                let defense_creep: Creep | null = null

                if (defenders.length > 0) {
                    defense_creep = defenders[i % defenders.length]
                }

                if (defense_creep && defense_creep.hits < defense_creep.hitsMax) {
                    tower.heal(defenders[i % defenders.length])
                }
                else {
                    tower.attack(hostile_creeps[i % hostile_creeps.length])
                }
            }
            else if(cool_down_counter.get() % repair_fire_rate === 0) {
                const ramparts = room.find(FIND_MY_STRUCTURES, {
                    filter: (struct) => {
                        return struct.structureType === STRUCTURE_RAMPART && struct.hits < struct.hitsMax
                    }
                }).sort(this.compFunc)

                const other_structs = room.find(FIND_STRUCTURES, {
                    filter: (struct) => {
                        return struct.hits < struct.hitsMax && struct.structureType !== STRUCTURE_RAMPART
                    }
                }).sort(this.compFunc)


                if (!this.targets.has(tower.id)) {
                    this.targets.set(tower.id, new RepairTarget(tower.id, ""))
                }

                if (nth_tower_target % 2 === 0) {
                    const all_structs = [...ramparts, ...other_structs]
                    if (all_structs.length > 0) {
                        this.targets.get(tower.id)!!.target = all_structs[0].id
                    }
                }
                else {
                    const all_structs = other_structs
                    if (!this.targets.get(tower.id)?.hasTarget() && all_structs.length > 0) {
                        this.targets.get(tower.id)!!.target = all_structs[0].id
                    }
                }


                this.targets.get(tower.id)?.repair()
                

            }
            cool_down_counter.add(1)
            nth_tower_target++
        }
    }

}
