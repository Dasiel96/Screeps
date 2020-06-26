import { StructTasks } from "./structureTasks"
import { CommonFunctions } from "./commonFuncs"
import { UnsignedNumber } from "./unsignedNum"

export class Links extends StructTasks {
    private role: string | null = null
    private amt_to_send: number | null = null
    private link_cool_down = new Map<string, UnsignedNumber>()

    constructor(role: string, amt_to_send: number) {
        super()
        this.role = role
        this.amt_to_send = amt_to_send
    }

    private getEnergyAmtToSend(energy_input: number) {
        return energy_input / .97
    }

    private getClosestLink(room: Room) {
        const spawn = room.find(FIND_MY_STRUCTURES, {
            filter: (s) => {
                return s.structureType === STRUCTURE_SPAWN
            }
        })

        let source: Source | null = null
        let send_link: StructureLink | null = null

        if (spawn.length > 0) {
            source = spawn[0].pos.findClosestByPath(FIND_SOURCES)
        }

        if (source) {
            const link_id = source.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                filter: (struct) => {
                    return struct.structureType === STRUCTURE_LINK
                }
            })?.id

            if (link_id) {
                send_link = Game.getObjectById<StructureLink>(link_id)
            }
        }

        return send_link
    }

    protected runLogic(room: Room): void {
        if (this.role) {
            const links = room.find(FIND_MY_STRUCTURES, {
                filter: { structureType: STRUCTURE_LINK }
            }) as StructureLink[]

            if (!this.link_cool_down.has(room.name)) {
                this.link_cool_down.set(room.name, new UnsignedNumber(0))
            }

            const cooldown = this.link_cool_down.get(room.name)!!




            let send_link: StructureLink | null = null
            this.amt_to_send = 100 * links.length

            for (const link of links) {
                if (send_link && link.cooldown === 0) {
                    this.amt_to_send -= 100
                    let status = send_link.transferEnergy(link, this.getEnergyAmtToSend(this.amt_to_send))

                    if (status === ERR_FULL){
                        const struct_link = link
                        const energy_top_off = struct_link.store.getCapacity()!! - struct_link.store.energy

                        status = send_link.transferEnergy(struct_link, energy_top_off)
                    }
                }
                send_link = link
            }



            if (cooldown.get() > 0) {
                cooldown.subtract(1)
            }
        }
    }
}




/*
const reciever_links = room.find(FIND_MY_STRUCTURES, {
                    filter: (structs) => {
                        return structs.structureType === STRUCTURE_LINK && structs.id !== send_link.id
                    }
                })

                if(!this.link_cool_down.has(room.name)){
                    this.link_cool_down.set(room.name, new UnsignedNumber(0))
                }

                const all_links: StructureLink[] = [send_link, ...(reciever_links as StructureLink[])]
                const cooldown = this.link_cool_down.get(room.name)

                if (all_links.length > 0 && this.link_cool_down.get(room.name)?.get() === 0) {

                    let amt_to_send = 100 * all_links.length
                    let prev_link: StructureLink | null = null

                    for(const link of all_links){

                        if (prev_link !== null){

                            amt_to_send -= 100
                            const status = prev_link.transferEnergy(link, this.getEnergyAmtToSend(amt_to_send))

                            console.log(`Link status: ${status}. Room: ${room.name}`)

                            if(typeof(cooldown?.get()) === "number" && prev_link.cooldown > cooldown.get()){
                                cooldown.set(prev_link.cooldown)
                            }
                        }

                        prev_link = link
                    }

                    if(typeof(cooldown?.get()) === "number" && cooldown.get() > 0){
                        cooldown.subtract(1)
                    }

*/