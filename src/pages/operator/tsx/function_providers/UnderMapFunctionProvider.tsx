import { ROSPose } from "shared/util"
import { storageHandler } from ".."
import { StorageHandler } from "../storage_handler/StorageHandler"
import { FunctionProvider } from "./FunctionProvider"

export enum UnderMapButton {
    SelectGoal = "Select Goal",
    DeleteGoal = "Delete Goal",
    CancelGoal = "Cancel Goal",
    SaveGoal = "Save Goal",
    LoadGoal = "Load Goal",
    GetPose = "Get Pose",
    GetSavedPoseNames = "Get Saved Pose Names",
    GetSavedPoses = "Get Saved Poses"
}

export class UnderMapFunctionProvider extends FunctionProvider {
    private selectGoal: boolean
    private storageHander: StorageHandler

    constructor(storageHandler: StorageHandler) {
        super()
        this.provideFunctions = this.provideFunctions.bind(this)
        this.selectGoal = false
        this.storageHander = storageHandler
    }

    public provideFunctions(button: UnderMapButton) {
        switch (button) {
            case UnderMapButton.SelectGoal:
                return (toggle: boolean) => {
                        this.selectGoal = toggle
                    } 
            case UnderMapButton.CancelGoal:
                return () => FunctionProvider.remoteRobot?.stopExecution() 
            case UnderMapButton.DeleteGoal:        
                return (idx: number) => {
                    let poses = this.storageHander.getMapPoseNames()
                    this.storageHander.deleteMapPose(poses[idx])
                }
            case UnderMapButton.SaveGoal:
                return (name: string) => {
                    let pose = FunctionProvider.remoteRobot?.getMapPose()
                    if (!pose) throw 'Cannot save undefined map pose!'
                    console.log(pose)
                    this.storageHander.saveMapPose(name, pose)
                }
            case UnderMapButton.LoadGoal:
                return (idx: number) => {
                    let poses = this.storageHander.getMapPoseNames()
                    let pose = this.storageHander.getMapPose(poses[idx])
                    let rosPose = {
                        position: {
                            x: pose.translation.x,
                            y: pose.translation.y,
                            z: 0
                        },
                        orientation: {
                            x: pose.rotation.x,
                            y: pose.rotation.y,
                            z: pose.rotation.z,
                            w: pose.rotation.w,
                        }
                    } as ROSPose
                    FunctionProvider.remoteRobot?.moveBase(rosPose)
                    return pose.translation
                } 
            case UnderMapButton.GetPose:
                return () => { return FunctionProvider.remoteRobot?.getMapPose() }
            case UnderMapButton.GetSavedPoseNames:
                return () => { return this.storageHander.getMapPoseNames() }
            case UnderMapButton.GetSavedPoses:
                return () => { return this.storageHander.getMapPoses() }
            default:
                throw Error(`Cannot get function for unknown UnderMapButton ${button}`)
        }
    }
}