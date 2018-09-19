# creator_wechat_rank_demo
使用方式
首先加载这个排行榜的节点并设置成常驻节点

js可getComponent调用
this.wxRankListNode.getComponent("wxRankList").loadLevelOpenRank() //显示关卡进度排行
this.wxRankListNode.getComponent("wxRankList").onClose() //隐藏排行榜

ts可import后直接用instance方法调用
import wxRankList from "./wxRankList";
wxRankList.instance.node.active = true
wxRankList.instance.loadHorRank(1) //横向比较第一关得分排行
wxRankList.instance.onClose() //隐藏排行榜
注意：排行榜节点显示用node.active即可，隐藏要用onClose方法
