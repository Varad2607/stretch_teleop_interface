import { Message } from 'roslib'

export type ValidJoints = 'joint_head_tilt' | 'joint_head_pan' | 'joint_gripper_finger_left' | 'wrist_extension' | 'joint_lift' | 'joint_wrist_yaw' | "translate_mobile_base" | "rotate_mobile_base" | 'gripper_aperture' | 'joint_arm_l0' | 'joint_arm_l1' | 'joint_arm_l2' | 'joint_arm_l3';

export type VelocityGoalArray = [{[key in ValidJoints]?: number}, {[key in ValidJoints]?: number}]

export interface ROSJointState extends Message {
    name: [ValidJoints?],
    position: [number],
    effort: [number],
    velocity: [number],
}

export interface ROSCompressedImage extends Message {
    header: string,
    format: "jpeg" | "png",
    data: string
}

export interface CameraInfo {
    [key: string]: string
}

export interface SignallingMessage {
    candidate?: RTCIceCandidate,
    sessionDescription?: RTCSessionDescription,
    cameraInfo?: CameraInfo
}

export type WebRTCMessage = SensorMessage | JointStateMessage;

export interface SensorMessage {
    type: "sensor",
    subtype: string,
    name: "effort" | "transform" | "value",
    value: number | ROSLIB.Transform
}

export type RobotPose = { [key in ValidJoints]?: number }

export interface JointStateMessage {
    type: "jointState",
    jointState: RobotPose
}

export const JOINT_LIMITS: { [key in ValidJoints]?: [number, number] } = {
    "wrist_extension": [0.0, .518],
    "joint_wrist_yaw": [-1.38, 4.45],
    "joint_lift": [0.1, 1.05],
    "translate_mobile_base": [-30.0, 30.0],
    "rotate_mobile_base": [-3.14, 3.14],
    "joint_gripper_finger_left": [-0.375, 0.166],
    "joint_head_tilt": [-1.67, 0.4],
    "joint_head_pan": [-4.0, 1.8]
}

export const JOINT_VELOCITIES: { [key in ValidJoints]?: number } = {
    "joint_head_tilt": .3,
    "joint_head_pan": .3,
    "wrist_extension": .04,
    "joint_lift": .04,
    "joint_wrist_yaw": .1,
    "translate_mobile_base": .1,
    "rotate_mobile_base": .1
}

export const navigationProps = {
    width: 768,
    height: 1024,
    fps: 6.0
}

export const realsenseProps = {
    width: 360,
    height: 640,
    fps: 6.0
}

export const gripperProps = {
    width: 900,
    height: 768,
    fps: 6.0
}

export interface VideoProps {
    topicName: string,
    callback: (message: ROSCompressedImage) => void
}

////////////////////////////////////////////////////////////
// safelyParseJSON code copied from
// https://stackoverflow.com/questions/29797946/handling-bad-json-parse-in-node-safely
// on August 18, 2017
export function safelyParseJSON<T = any>(json: string): T {
    // This function cannot be optimized, it's best to
    // keep it small!
    let parsed;

    try {
        parsed = JSON.parse(json);
    } catch (e) {
        console.warn(e);
    }

    return parsed; // Could be undefined!
}

export type uuid = string;
// From: https://stackoverflow.com/a/2117523/6454085
export function generateUUID(): uuid {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// export type GoalMessage =  NavGoalMessage | PoseGoalMessage;

// export interface NavGoalMessage {
//     type: "goal",
//     name: "nav",
//     status: "success" | "failure",
//     value: NavGoalCommand
// }

// export interface PoseGoalMessage {
//     type: "goal",
//     name: "pose",
//     status: "success" | "failure",
//     value: PoseGoalCommand
// }