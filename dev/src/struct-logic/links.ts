import { StructTasks } from "./structureTasks"
import { CommonFunctions } from "../commonFuncs"
import { UnsignedNumber } from "../unsignedNum"
import { RoomManager } from "../managers/roomManager"

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

    protected runLogic(room: Room): void {
        if (this.role) {
            const links = RoomManager.getInstance().getMyStructs([STRUCTURE_LINK]) as StructureLink[]

            if (!this.link_cool_down.has(room.name)) {
                this.link_cool_down.set(room.name, new UnsignedNumber(0))
            }

            const cooldown = this.link_cool_down.get(room.name)!!

            let send_link: StructureLink | null = null
            this.amt_to_send = 100 * links.length

            for (const link of links) {
                if (send_link) {
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