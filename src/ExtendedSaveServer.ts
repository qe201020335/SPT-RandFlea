import {SaveServer} from "@spt-aki/servers/SaveServer";
import {SaveLoadRouter} from "@spt-aki/di/Router";
import {inject, injectable, injectAll} from "tsyringe";
import {VFS} from "@spt-aki/utils/VFS";
import {JsonUtil} from "@spt-aki/utils/JsonUtil";
import {HashUtil} from "@spt-aki/utils/HashUtil";
import {LocalisationService} from "@spt-aki/services/LocalisationService";
import {ILogger} from "@spt-aki/models/spt/utils/ILogger";
import {ConfigServer} from "@spt-aki/servers/ConfigServer";
import {IAkiProfile} from "@spt-aki/models/eft/profile/IAkiProfile";
import {RandomizedRagfairOfferGenerator} from "./RandomizedRagfairOfferGenerator";

@injectable()
export class ExtendedSaveServer extends SaveServer
{
    constructor(
        @inject("VFS") vfs: VFS,
        @injectAll("SaveLoadRouter") saveLoadRouters: SaveLoadRouter[],
        @inject("JsonUtil") jsonUtil: JsonUtil,
        @inject("HashUtil") hashUtil: HashUtil,
        @inject("LocalisationService") localisationService: LocalisationService,
        @inject("WinstonLogger") logger: ILogger,
        @inject("ConfigServer") configServer: ConfigServer,
    )
    {
        super(vfs, saveLoadRouters, jsonUtil, hashUtil, localisationService, logger, configServer)
    }

    public override getProfile(sessionId: string): IAkiProfile
    {
        const originalReturn = super.getProfile(sessionId);  // it has all the error checking

        const specialHdr = RandomizedRagfairOfferGenerator.specialSid

        if (!sessionId.startsWith(specialHdr))
        {
            return originalReturn
        }

        // this.logger.debug(`[ExtendedSaveServer] special session id: ${sessionId}`)

        // return a profile from all the profiles base on the seed
        const seed = parseInt(sessionId.substring(sessionId.lastIndexOf(specialHdr) + specialHdr.length))

        const ids : string[] = []
        for (const id in this.profiles)
        {
            ids.push(id)
        }

        const randomSid = ids[seed % ids.length]
        // this.logger.debug(`[ExtendedSaveServer] ${sessionId} -> ${randomSid}`)

        return this.profiles[randomSid]
    }
}