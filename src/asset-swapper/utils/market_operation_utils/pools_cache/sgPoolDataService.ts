import { ChainId } from '@0x/contract-addresses';
import { logUtils } from '@0x/utils';
import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sor';
import { gql, request } from 'graphql-request';

const queryWithLinear = gql`
    query fetchTopPoolsWithLinear($maxPoolsFetched: Int!) {
        pools: pools(
            first: $maxPoolsFetched
            where: { swapEnabled: true, totalShares_not_in: ["0", "0.000000000001"] }
            orderBy: totalLiquidity
            orderDirection: desc
        ) {
            id
            address
            poolType
            swapFee
            totalShares
            tokens {
                address
                balance
                decimals
                weight
                priceRate
            }
            tokensList
            totalWeight
            amp
            expiryTime
            unitSeconds
            principalToken
            baseToken
            swapEnabled
            wrappedIndex
            mainIndex
            lowerTarget
            upperTarget
            sqrtAlpha
            sqrtBeta
            root3Alpha
        }
    }
`;

const QUERY_BY_CHAIN_ID: { [chainId: number]: string } = {
    [ChainId.Mainnet]: queryWithLinear,
    [ChainId.Polygon]: queryWithLinear,
    [ChainId.Arbitrum]: queryWithLinear,
    [ChainId.Optimism]: queryWithLinear,
    [ChainId.Fantom]: queryWithLinear,
};

const DEFAULT_MAX_POOLS_FETCHED = 96;

/**
 * Simple service to query required info from Subgraph for Balancer Pools.
 * Because Balancer Subgraphs have slightly different schema depending on network the queries are adjusted as needed.
 */
export class SubgraphPoolDataService implements PoolDataService {
    private readonly _gqlQuery: string | undefined;

    constructor(
        private readonly _config: {
            chainId: number;
            subgraphUrl: string | null;
            maxPoolsFetched?: number;
        },
    ) {
        this._config.maxPoolsFetched = this._config.maxPoolsFetched || DEFAULT_MAX_POOLS_FETCHED;
        this._gqlQuery = QUERY_BY_CHAIN_ID[this._config.chainId];
    }

    public async getPools(): Promise<SubgraphPoolBase[]> {
        if (!this._gqlQuery || !this._config.subgraphUrl) {
            return [];
        }
        try {
            const { pools } = await request<{ pools: SubgraphPoolBase[] }>(this._config.subgraphUrl, this._gqlQuery, {
                maxPoolsFetched: this._config.maxPoolsFetched,
            });
            return pools;
        } catch (err) {
            logUtils.warn(`Failed to fetch BalancerV2 subgraph pools: ${err.message}`);
            return [];
        }
    }
}
