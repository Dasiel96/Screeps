import { CommonFunctions } from "./commonFuncs"
import { Defender } from "./defender"
import { task_names, flags } from "./enums"
import { StructTasks } from "./structureTasks"
import { UnsignedNumber } from "./unsignedNum"
import { RepairTarget } from "./repairTarget"
import { RoomManager } from "./roomManager"

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
        let hostile_creeps: Creep[]
        const all_enemies = RoomManager.getInstance().getHostileCreeps()

        const hostile_healers = new Array<Creep>()
        const hostile_range = new Array<Creep>()
        const hostile_attack = new Array<Creep>()
        const hostile_other = new Array<Creep>()

        for (const creep of all_enemies){
            let is_misc_creep = false
            for (const part of creep.body){
                if (part.type === HEAL){
                    hostile_healers.push(creep)
                    is_misc_creep = true
                    break
                }
                else if (part.type === RANGED_ATTACK){
                    hostile_range.push(creep)
                    is_misc_creep = true
                    break
                }
                else if (part.type === ATTACK){
                    hostile_attack.push(creep)
                    is_misc_creep = true
                    break
                }
            }

            if (!is_misc_creep){
                hostile_other.push(creep)
            }
        }

        hostile_creeps = [...hostile_healers, ...hostile_range, ...hostile_attack, ...hostile_other]


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
        const struct_type: StructureConstant[] = [STRUCTURE_TOWER]
        const towers = RoomManager.getInstance().getMyStructs(struct_type)
        const room_id = 1

        let repair_fire_rate = 10
        let defense_fire_rate = 5

        let nth_tower_target = 0

        const becon = Game.flags[flags[flags.becon]]


        for (let i = 0; i < towers.length; i++) {

            if (!this.tower_cool_down.has(towers[i].id)) {
                this.tower_cool_down.set(towers[i].id, new UnsignedNumber(0))
            }
            const tower = Game.getObjectById<StructureTower>(towers[i].id)!!
            const cool_down_counter = this.tower_cool_down.get(towers[i].id)!!

            if (tower && !this.num_of_links_near_tower.has(tower.id)) {
                const num_of_links = tower.pos.findInRange(FIND_STRUCTURES, 3, {
                    filter: (struct) => {
                        return struct.structureType === STRUCTURE_LINK
                    }
                }).length

                this.num_of_links_near_tower.set(tower.id, num_of_links)
            }

            if (cool_down_counter.get() % defense_fire_rate === 0 && Defender.underAttack) {
                const hostile_creeps = this.getHostileCreeps()
                const defenders = RoomManager.getInstance().getMyCreeps(this.defender_role)
                let defense_creep: Creep | null = null

                if (defenders && defenders.length > 0) {
                    defense_creep = defenders[i % defenders.length]
                }

                if (defenders && tower && defense_creep && defense_creep.hits < defense_creep.hitsMax) {
                    tower.heal(defenders[i % defenders.length])
                }
                else if (tower) {
                    tower.attack(hostile_creeps[i % hostile_creeps.length])
                }
            }
            else if (cool_down_counter.get() % repair_fire_rate === 0) {
                const struct_type: StructureConstant[] = [STRUCTURE_RAMPART]
                const ramparts = RoomManager.getInstance().getMyStructs(struct_type, (s: AnyStructure) => {
                    return s.hits < s.hitsMax
                }).sort(this.compFunc)

                const other_structs = RoomManager.getInstance().getMyStructs([], (s: AnyStructure) => {
                    return s.structureType !== STRUCTURE_RAMPART && s.hits < s.hitsMax
                }).sort(this.compFunc)

                //CommonFunctions.filterPrint(room.name, room_id, other_structs[0].structureType)

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
