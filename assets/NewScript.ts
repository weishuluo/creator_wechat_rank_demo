import wxRankList from "./script/comp/wxRankList";

// Learn TypeScript:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {


    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}

    start () {
        cc.find("button1").zIndex = 10
        cc.find("button2").zIndex = 10


        cc.loader.loadRes("prefab/rankList",(err, prefab)=>{
            if(err){
                console.log(err)
                return;
            }

            // 设置成常驻节点
            let ranklistNode:cc.Node = cc.instantiate(prefab)
            cc.game.addPersistRootNode(ranklistNode)
            ranklistNode.x = cc.director.getWinSize().width*0.5
            ranklistNode.y = cc.director.getWinSize().height*0.5

            // 两种调用方式
            ranklistNode.getComponent(wxRankList).loadLevelOpenRank()
            // wxRankList.instance.loadLevelOpenRank();//第一关得分排行
        })

    }

    onBtn1(){
        wxRankList.instance.uploadScore(1, 100);//上传第一关得分
        wxRankList.instance.loadHorRank(1);//第一关横向排行
    }

    onBtn2(){
        wxRankList.instance.uploadLevelOpen(1);//上传关卡进度
        wxRankList.instance.loadLevelOpenRank();//关卡进度排行
    }

    // update (dt) {}
}
